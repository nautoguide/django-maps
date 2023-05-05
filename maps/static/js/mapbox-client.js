function mapboxClient(style, center, icons, query, url, maxZoom, location, links, click_url, clickFunction, locationFunction, nearFunction ) {
	maxZoom = parseInt(maxZoom);

	if (center && center.coordinates)
		center = center.coordinates;

	let options = {
		container: 'map',
		style: style,
		maxZoom: maxZoom,
		minZoom: 0,
		pitch: 0,
		center: center,
		zoom: 10
	}


	if (query !== 'None')
		url += '?' + query + '=' + document.getElementById(query).value;

	window.map = new maplibregl.Map(options);

	window.map.on('load', function () {
		loadIcons(icons);
		enableLocation();
		fetch(url)
			.then(response => response.json())
			.then(data => {
				window.geojson = data;
				window.map.getSource('data').setData(data);
				if (links === 'True') {
					const lineSource = createLineSource(data.features);
					window.map.getSource('data').setData(lineSource);
				}
				const bbox = turf.bbox(data);
				window.map.fitBounds(bbox, {padding: 20, maxZoom: options.maxZoom})
			})
			.catch(error => console.error(error));
	});

	window.map.on('click', 'data', (event) => {
		const features = window.map.queryRenderedFeatures(event.point, {layers: ['data']});
		if (features.length > 0) {
			window.location = click_url;
		}
	});

	function reload_map_data() {
		fetch(`${url}?q=${document.getElementById('q').value}`)
			.then(response => response.json())
			.then(data => {
				// Process the retrieved data here
				debugger;
				window.map.getSource('data').setData(data);
				const bbox = turf.bbox(data);
				window.map.fitBounds(bbox, {padding: 200})
			});
	}

	function loadIcons(icons) {
		icons.forEach((icon) => {
			window.map.loadImage(icon.url, (error, image) => {
				if (error) {
					console.error('Error loading icon:', error);
					return;
				}

				// Add the image to the map
				if (!window.map.hasImage(icon.name)) {
					window.map.addImage(icon.name, image);
				}
			});
		});
	}

	function createLineSource(features) {
		// Get the first feature's coordinates
		const firstFeatureCoords = features[0].geometry.coordinates;

		// Create a GeoJSON LineString for each connection
		const lines = features.slice(1).map((feature) => {
			return {
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: [firstFeatureCoords, feature.geometry.coordinates],
				},
			};
		});

		// Create a GeoJSON FeatureCollection for the line source
		return {
			type: 'FeatureCollection',
			features: lines,
		};
	}

	window.map.moveToPoint = function (point, zoom) {
		window.map.flyTo({center: point.coordinates, zoom: zoom});
	}

	window.map.zoomToExtent = function () {
		const bbox = turf.bbox(window.geojson);
		window.map.fitBounds(bbox, {padding: 20, maxZoom: options.maxZoom})
	}

	window.map.setSelected = function (id) {
		for (let feature in window.geojson.features) {
			if (window.geojson.features[feature].properties.id === id) {
				let selected_feature = {
					type: "FeatureCollection",
					features: [window.geojson.features[feature]]
				}

				window.map.getSource('selected').setData(selected_feature);
			}
		}


	}

	function calculateDistance(lat1, lon1, lat2, lon2) {
		const R = 6371e3; // Earth radius in meters
		const lat1Rad = lat1 * (Math.PI / 180);
		const lat2Rad = lat2 * (Math.PI / 180);
		const deltaLat = (lat2 - lat1) * (Math.PI / 180);
		const deltaLon = (lon2 - lon1) * (Math.PI / 180);

		const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
			Math.cos(lat1Rad) * Math.cos(lat2Rad) *
			Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return R * c;
	}

	function onNearPoint(point) {
		logDebug('Near point:', point.properties.name);
		if (typeof nearFunction === 'function') {
			nearFunction(point);
		}
	}

	function checkNearPoints(latitude, longitude) {
		const threshold = 100; // Distance threshold in meters
		if (window.geojson) {
			window.geojson.features.forEach(point => {
				const [pointLon, pointLat] = point.geometry.coordinates;
				const distance = calculateDistance(latitude, longitude, pointLat, pointLon);
				logDebug(distance)
				if (distance <= threshold) {
					onNearPoint(point);
					let lines = createLineTo(point.geometry.coordinates, [longitude, latitude]);
					window.map.getSource('line-source').setData(lines);

					// only one point can be near TODO distance check
					return;
				}
			});
		}
	}

	function logDebug(text) {
		let debugwin = document.getElementById('debug');
		if (debugwin)
			debugwin.value += text + "\n";
	}

	function onPositionUpdate(position) {
		const {latitude, longitude} = position.coords;
		let pointJson = {
			"type": "Feature",
			"geometry": {"coordinates": [longitude, latitude], "type": "Point"},
			"properties": {"icon": "point"}
		}

		window.map.getSource('location').setData({
			type: "FeatureCollection",
			features: [pointJson]
		});
		if (typeof locationFunction === 'function') {
			locationFunction(pointJson);
		}
		logDebug(`Current location: (${latitude}, ${longitude})`);
		checkNearPoints(latitude, longitude);
	}

	function onPositionError(error) {
		logDebug('Error:', error.message);

	}

	function enableLocation() {
		if (location === 'True') {
			if ('geolocation' in navigator) {
				navigator.geolocation.watchPosition(onPositionUpdate, onPositionError, {
					enableHighAccuracy: true,
					timeout: 5000,
					maximumAge: 0
				});
			} else {
				logDebug('Geolocation is not supported by your browser.');
			}
		}
	}

	function createLineTo(featureFrom, featureTo) {

		// Create a GeoJSON LineString for each connection
		let line = [{
			type: 'Feature',
			geometry: {
				type: 'LineString',
				coordinates: [featureFrom, featureTo],
			},
		}];


		// Create a GeoJSON FeatureCollection for the line source
		return {
			type: 'FeatureCollection',
			features: line,
		};
	}


}