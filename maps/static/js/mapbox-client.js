//function mapboxClient(style, center, icons, query, url, maxZoom, location, links, click_url, clickFunction, locationFunction, nearFunction,threshold,cluster,controls,geojson ) {
function mapboxClient( params ) {

	params.maxZoom = parseInt(params.maxZoom);

	const clusterIndex = new Supercluster({
		radius: 50,
		maxZoom: 12
	});

	window.geojson={"type":"FeatureCollection","features":[]};
	clusterIndex.load(window.geojson.features);

	if(params.nearFunction!=='None') {
		params.nearFunction=window[params.nearFunction];
	}
	if(params.clickFunction!=='None') {
		params.clickFunction=window[params.clickFunction];
	}

	let page=1;

	params.center=JSON.parse(params.center);

	if (params.center && params.center.coordinates)
		params.center = params.center.coordinates;

	let options = {
		container: 'map',
		style: params.style,
		maxZoom: params.maxZoom,
		minZoom: 0,
		pitch: 0,
		center: params.center,
		zoom: 10
	}

	if (params.query !== 'None')
		params.json_url += '?' + params.query + '=' + document.getElementById(params.query).value;

	window.map = new maplibregl.Map(options);
	if(params.controls==='True') {
		window.map.addControl(new maplibregl.NavigationControl());
	}

	window.map.on('load', function () {
		loadIcons(params.icons);
		enableLocation();

		if(params.cluster==='True') {
			map.addSource('clusters', {
				type: 'geojson',
				data: getClusters()
			});

			map.addLayer({
				id: 'clusters-outer',
				type: 'circle',
				source: 'clusters',
				paint: {
					'circle-radius': [
						'step',
						['get', 'point_count'],
						7, 10, // Radius for clusters with 10 or less points
						12, 50, // Radius for clusters with 50 or less points
						17, 100, // Radius for clusters with 100 or less points
						22, 300, // Radius for clusters with 300 or less points
						28, 750, // Radius for clusters with 750 or less points
						28, // Radius for clusters with more than 750 points
					],
					'circle-color': '#062b33',
					'circle-opacity': 0.5
				}
			});

			map.addLayer({
				id: 'clusters',
				type: 'circle',
				source: 'clusters',
				paint: {
					'circle-radius': [
						'step',
						['get', 'point_count'],
						5, 10, // Radius for clusters with 10 or less points
						10, 50, // Radius for clusters with 50 or less points
						15, 100, // Radius for clusters with 100 or less points
						20, 300, // Radius for clusters with 300 or less points
						25, 750, // Radius for clusters with 750 or less points
						25, // Radius for clusters with more than 750 points
					],
					'circle-color': [
						'step',
						['get', 'point_count'],
						'#72cde7', 10, // Color for clusters with 10 or less points
						'#3e90a6', 50, // Color for clusters with 50 or less points
						'#347e98', 100, // Color for clusters with 100 or less points
						'#286679', 300, // Color for clusters with 300 or less points
						'#135262', 750, // Color for clusters with 750 or less points
						'#03485b', // Color for clusters with more than 750 points
					],
					'circle-opacity': 0.8
				}
			});



			map.addLayer({

				id: 'cluster-labels',
				type: 'symbol',
				source: 'clusters',
				filter: ['has', 'point_count'],
				'layout': {
					"text-font": ["Open Sans Regular"],
					'text-field': ['get', 'point_count'],
					'text-variable-anchor': ['center', 'bottom', 'left', 'right'],
					'text-radial-offset': 0.5,
					'text-justify': 'auto',
					'text-size': 12
				},
				paint: {
					'text-color': '#ffffff'
				}
			});


			map.addLayer({
				id: 'unclustered-points',
				type: 'symbol',
				source: 'clusters',
				filter: ['!=', 'cluster', true],
				layout: {
					'icon-image': [
						'match',
						['get', 'category'], // Get the 'category' property from the feature
						'ship', 'ship',
						'homeport', 'homeport',
						'memorial', 'memorial',
						'school', 'school',
						'submarine', 'submarine',
						'sailor'
					],
					'icon-size': 1, // Set the icon size
					'icon-allow-overlap': true,
					'icon-anchor': 'bottom'
				},
				paint: {
					'icon-opacity': 1 // Set the opacity of the icons
				}
			});

			map.on('moveend', () => {
				map.getSource('clusters').setData(getClusters());
			});

			clusterLoader();

		} else {
			if(params.json_url!=='None') {
				fetch(params.json_url)
					.then(response => response.json())
					.then(data => {
						window.geojson = data;
						window.map.getSource('data').setData(data);
						if (params.links === 'True') {
							const lineSource = createLineSource(data.features);
							window.map.getSource('line-source').setData(lineSource);
						}
						const bbox = turf.bbox(data);
						window.map.fitBounds(bbox, {padding: 20, maxZoom: options.maxZoom})
					})
					.catch(error => console.error(error));
			}
			if(params.geojson&&params.geojson.type) {
				window.geojson = params.geojson;
				window.map.getSource('data').setData(params.geojson);
			}
		}
	});

	window.map.on('click', 'data', (event) => {
		const features = window.map.queryRenderedFeatures(event.point, {layers: ['data']});
		if (features.length > 0 && params.click_url !== 'None') {
			params.click_url=params.click_url.replace('${id}',features[0].properties.id)
			window.location = params.click_url;
		}
		if( typeof params.clickFunction === 'function') {
			params.clickFunction(features[0].properties.id);
		}
	});

	map.on('click', 'unclustered-points', (event) => {
		const features = map.queryRenderedFeatures(event.point, {layers: ['unclustered-points']});
		if (features.length > 0 && click_url !== 'None') {
			params.click_url=params.click_url.replace('${id}',features[0].properties.id)
			window.location = params.click_url;
		}
		if( typeof params.clickFunction === 'function') {
			params.clickFunction(features[0].properties.id);
		}
	});

	window.map.on('click', 'clusters', (e) => {
		const clusterCoordinates = e.features[0].geometry.coordinates;

		// Set the new zoom level, making sure it doesn't exceed the maximum allowed zoom level
		const newZoom = Math.min(window.map.getZoom() + 2, window.map.getMaxZoom());

		// Center the map on the clicked cluster and zoom in
		window.map.easeTo({
			center: clusterCoordinates,
			zoom: newZoom,
			duration: 1000 // Animate the transition for 1000 ms
		});

	});

	function reload_map_data() {
		fetch(`${params.json_url}?q=${document.getElementById('q').value}`)
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

	function onNearPoint(point,distance) {
		logDebug(`Near point: ${point.properties.name} - ${distance}`);
		if (typeof params.nearFunction === 'function') {
			params.nearFunction(point.properties.id,point,distance);
		}
	}

	function checkNearPoints(latitude, longitude) {
		if (window.geojson) {
			let candidate_list=[];
			window.geojson.features.forEach(point => {
				const [pointLon, pointLat] = point.geometry.coordinates;
				const distance = calculateDistance(latitude, longitude, pointLat, pointLon);
				logDebug(distance)
				if (distance <= params.threshold) {
					candidate_list.push({point:point,distance:distance})

				}
			});
			if(candidate_list.length > 0) {
				let shortest_index=-1;
				let shortest_distance=params.threshold;
				for (let i in candidate_list) {
					if(candidate_list[i].distance<=shortest_distance) {
						shortest_distance=candidate_list[i].distance;
						shortest_index=i;
					}
				}
				onNearPoint(candidate_list[shortest_index].point,candidate_list[shortest_index].distance);
				let lines = createLineTo(candidate_list[shortest_index].point.geometry.coordinates, [longitude, latitude]);
				window.map.getSource('line-source').setData(lines);
				return;
			}
		}
	}

	function logDebug(text) {
		let debugwin = document.getElementById('debug');
		if (debugwin)
			debugwin.value += text + "\n";
		else
			console.log(text)
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
		if (typeof params.locationFunction === 'function') {
			params.locationFunction(pointJson);
		}
		logDebug(`Current location: (${latitude}, ${longitude})`);
		checkNearPoints(latitude, longitude);
	}

	function onPositionError(error) {
		logDebug('Error:', error.message);

	}

	function enableLocation() {
		if (params.location === 'True') {
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

	function getClusters() {
		const bbox = map.getBounds().toArray().flat();
		const zoom = map.getZoom();
		return {type:"FeatureCollection","features":clusterIndex.getClusters(bbox, Math.round(zoom))};
	}


	function clusterLoader() {
		fetch(`${url}?p=${page}&ps=500`)
			.then(response => response.json())
			.then(data => {

				window.geojson.features=[...window.geojson.features,...data.features];
				//console.log(data);
				clusterIndex.load(window.geojson.features);
				map.getSource('clusters').setData(getClusters());
				if(data.more===false) {
					let element = document.getElementById("map_spin");
					element.classList.add("hidden")
					//const bbox = turf.bbox(globalGeojson);
					//map.fitBounds(bbox, {padding: 200})
				} else {
					page++;
					map.triggerRepaint();
					setTimeout(clusterLoader,100);
				}

			}).catch(error => console.error(error));
	}

	// External functions

	window.map.moveToPoint = function (point, zoom) {
		window.map.flyTo({center: point.coordinates, zoom: zoom});
	}

	window.map.zoomToExtent = function () {
		const bbox = turf.bbox(window.geojson);
		window.map.fitBounds(bbox, {padding: 20, maxZoom: options.maxZoom})
	}

	window.map.setSelected = function (id,zoom) {
		for (let feature in window.geojson.features) {
			if (window.geojson.features[feature].properties.id === id) {
				let selected_feature = {
					type: "FeatureCollection",
					features: [window.geojson.features[feature]]
				}

				window.map.getSource('selected').setData(selected_feature);
				if(zoom) {
					window.map.jumpTo({center: window.geojson.features[feature].geometry.coordinates, zoom: zoom});
				}
			}
		}
	}

	window.map.addGeojson = function (geojson) {
		window.geojson = geojson;
		window.map.getSource('data').setData(geojson);
		const bbox = turf.bbox(geojson);
		window.map.fitBounds(bbox, {padding: 20, maxZoom: options.maxZoom})
	}

}