
function mapboxClient( params ) {
	let queue = [];
	let loaded = false;
	let currentLocation = null;
	let debug = false;
	params.maxZoom = parseInt(params.maxZoom);
	params.zoom = parseInt(params.zoom);
	params.padding = parseInt(params.padding);

	// location stuff
	let latSum = 0;
	let lonSum = 0;
	let updateCount = 0;
	let intervalId;
	let firstUpdate = true;

	let events=[];

	const clusterIndex = new Supercluster({
		radius: 50,
		maxZoom: 12
	});

	window.geojson={'data':{"type":"FeatureCollection","features":[]}};
	clusterIndex.load(window.geojson['data'].features);
	if(params.nearFunction!=='None') {
		params.nearFunction=window[params.nearFunction];
	}
	if(params.clickFunction!=='None') {
		params.clickFunction=window[params.clickFunction];
	}
	if(params.locationFunction!=='None') {
		params.locationFunction=window[params.locationFunction];
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
		zoom: params.zoom,
		attributionControl: false,
		clickTolerance: 1,
		dragPan: true,
	}
	if (params.query !== 'None')
		params.json_url += '?' + params.query + '=' + document.getElementById(params.query).value;

	window.map = new maplibregl.Map(options);
	if(params.controls==='True') {
		window.map.addControl(new maplibregl.NavigationControl());
	}

	const draw = new MapboxDraw({
		displayControlsDefault: false,
// Select which mapbox-gl-draw control buttons to add to the map.
		controls: {
			polygon: false,
			trash: true
		},
		styles: [
			// ACTIVE (being drawn)
			// line stroke
			{
				"id": "gl-draw-line",
				"type": "line",
				"filter": ["all", ["==", "$type", "LineString"], ["!=", "mode", "static"]],
				"layout": {
					"line-cap": "round",
					"line-join": "round"
				},
				"paint": {
					"line-color": "#D20C0C",
					"line-dasharray": [0.2, 2],
					"line-width": 4
				}
			},
			// polygon fill
			{
				"id": "gl-draw-polygon-fill",
				"type": "fill",
				"filter": ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
				"paint": {
					"fill-color": "#D20C0C",
					"fill-outline-color": "#D20C0C",
					"fill-opacity": 0.1
				}
			},
			// polygon mid points
			{
				'id': 'gl-draw-polygon-midpoint',
				'type': 'circle',
				'filter': ['all',
					['==', '$type', 'Point'],
					['==', 'meta', 'midpoint']],
				'paint': {
					'circle-radius': 12,
					'circle-color': '#fbb03b'
				}
			},
			// polygon outline stroke
			// This doesn't style the first edge of the polygon, which uses the line stroke styling instead
			{
				"id": "gl-draw-polygon-stroke-active",
				"type": "line",
				"filter": ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
				"layout": {
					"line-cap": "round",
					"line-join": "round"
				},
				"paint": {
					"line-color": "#D20C0C",
					"line-dasharray": [0.2, 2],
					"line-width": 4
				}
			},
			// vertex point halos
			{
				"id": "gl-draw-polygon-and-line-vertex-halo-active",
				"type": "circle",
				"filter": ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
				"paint": {
					"circle-radius": 12,
					"circle-color": "#FFF"
				}
			},
			// vertex points
			{
				"id": "gl-draw-polygon-and-line-vertex-active",
				"type": "circle",
				"filter": ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"], ["!=", "mode", "static"]],
				"paint": {
					"circle-radius": 8,
					"circle-color": "#D20C0C",
				}
			},

			// INACTIVE (static, already drawn)
			// line stroke
			{
				"id": "gl-draw-line-static",
				"type": "line",
				"filter": ["all", ["==", "$type", "LineString"], ["==", "mode", "static"]],
				"layout": {
					"line-cap": "round",
					"line-join": "round"
				},
				"paint": {
					"line-color": "#000",
					"line-width": 3
				}
			},
			// polygon fill
			{
				"id": "gl-draw-polygon-fill-static",
				"type": "fill",
				"filter": ["all", ["==", "$type", "Polygon"], ["==", "mode", "static"]],
				"paint": {
					"fill-color": "#000",
					"fill-outline-color": "#000",
					"fill-opacity": 0.1
				}
			},
			// polygon outline
			{
				"id": "gl-draw-polygon-stroke-static",
				"type": "line",
				"filter": ["all", ["==", "$type", "Polygon"], ["==", "mode", "static"]],
				"layout": {
					"line-cap": "round",
					"line-join": "round"
				},
				"paint": {
					"line-color": "#000",
					"line-width": 3
				}
			}
		]
// Set mapbox-gl-draw to draw by default.
// The user does not have to click the polygon control button first.
		//defaultMode: 'draw_line_string'
	});

	map.addControl(draw);


	window.map.on('load', function () {
		loaded=true;
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
					// TODO NMRN fix
					/*'icon-image': [
						'match',
						['get', 'category'], // Get the 'category' property from the feature
						'ship', 'ship',
						'homeport', 'homeport',
						'memorial', 'memorial',
						'school', 'school',
						'submarine', 'submarine',
						'sailor'
					],*/
					'icon-image': ['get', 'icon'],
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
			if(params.json_url!=='None')
				clusterLoader();

		} else {
			if(params.json_url!=='None') {
				fetch(params.json_url)
					.then(response => response.json())
					.then(data => {
						window.geojson['data'] = data;
						window.map.getSource('data').setData(data);
						if (params.links === 'True') {
							const lineSource = createLineSource(data.features);
							window.map.getSource('line-source').setData(lineSource);
						}
						if(params.fit === 'True') {
							const bbox = turf.bbox(data);
							window.map.fitBounds(bbox, {padding: 20, maxZoom: options.maxZoom})
						}
						if (params.location === 'True' && currentLocation) {
							checkNearPoints(currentLocation[0], currentLocation[1]);
						}
					})
					.catch(error => console.error(error));
			}
			if(params.geojson&&params.geojson.type) {
				window.geojson['data'] = params.geojson;
				window.map.getSource('data').setData(params.geojson);
			}
		}
		process_queue();
	});




	/*window.map.on('click', 'data', (event) => {

		const features = window.map.queryRenderedFeatures(event.point, {layers: ['data']});
		if (features.length > 0 && params.click_url !== 'None') {
			params.click_url=params.click_url.replace('${id}',features[0].properties.id)
			window.location = params.click_url;
		}
		if( typeof params.clickFunction === 'function') {
			params.clickFunction(features[0].properties.id);
		}
	});
*/
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
		if (window.geojson['data']) {
			let candidate_list=[];
			window.geojson['data'].features.forEach(point => {
				const [pointLon, pointLat] = point.geometry.coordinates;
				const distance = calculateDistance(latitude, longitude, pointLat, pointLon);
				logDebug(`distance: ${distance}`);
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
		if (debugwin) {
			debugwin.value += text + "\n";
		} else {
			if(debug===true)
				console.log(text);
		}
	}

	function initPositionAveraging() {
		// Clear any existing interval
		if (intervalId) {
			clearInterval(intervalId);
		}

		// Set up a new interval to calculate the average every x seconds
		intervalId = setInterval(() => {
			intervalFunction();
		}, params.updateInterval * 1000);
	}

	function intervalFunction() {
		if (updateCount > 0) {
			let avgLat = latSum / updateCount;
			let avgLon = lonSum / updateCount;

			// Call your update function with the average location
			let pointJson = {
				"type": "Feature",
				"geometry": {"coordinates": [avgLon, avgLat], "type": "Point"},
				"properties": {"icon": "point"}
			}

			window.map.getSource('location').setData({
				type: "FeatureCollection",
				features: [pointJson]
			});
			if (typeof params.locationFunction === 'function') {
				params.locationFunction(pointJson);
			}
			logDebug(`Current average location: (${avgLat}, ${avgLon}) precision: ${params.fixedPrecision} interval: ${params.updateInterval}`);
			currentLocation=[avgLat, avgLon];
			checkNearPoints(avgLat, avgLon);

			// Reset the sum and count for the next interval
			latSum = 0;
			lonSum = 0;
			updateCount = 0;
		}
	}

	function onPositionUpdate(position) {
		let {latitude, longitude} = position.coords;
		latitude=latitude.toFixed(params.fixedPrecision);
		longitude=longitude.toFixed(params.fixedPrecision);
		latSum += parseFloat(latitude);
		lonSum += parseFloat(longitude);
		updateCount++;
		if(firstUpdate) {
			firstUpdate=false;
			intervalFunction();
		}

	}

	function onPositionError(error) {
		logDebug('Error:', error.message);

	}

	function enableLocation() {
		if (params.location === 'True') {
			if ('geolocation' in navigator) {
				initPositionAveraging();
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
		fetch(`${params.json_url}?p=${page}&ps=500`)
			.then(response => response.json())
			.then(data => {

				window.geojson['data'].features=[...window.geojson['data'].features,...data.features];
				clusterIndex.load(window.geojson['data'].features);
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

	function pointDecoder(point) {
		let decoded_point=point;
		if(typeof decoded_point === 'string') {
			decoded_point=JSON.parse(decoded_point)
		}
		if(decoded_point.coordinates)
			return decoded_point;
		logDebug(`${point} does not seem valid`);
	}
	// External functions


	window.map.debug = function () {
		debug = !debug;
		console.log(`debug: ${debug? 'on' : 'off'}`);
	}

	window.map.setLayerVisibility = function(layer, visibility) {
		// Toggle the visibility
		if(loaded)
			map.setLayoutProperty(layer, 'visibility', visibility);
	}

	window.map.moveToPoint = function (point, zoom) {
		point=pointDecoder(point);
		window.map.flyTo({center: point.coordinates, zoom: zoom});
	}

	window.map.zoomToExtent = function () {
		const bbox = turf.bbox(window.geojson['data']);
		window.map.fitBounds(bbox, {padding: params.padding, maxZoom: options.maxZoom})
	}

	window.map.clearSelected = function (id,zoom) {
		if(loaded)
			window.map.getSource('selected').setData({"type":"FeatureCollection","features":[]});
	}

	window.map.setSelected = function (id,zoom) {
		for (let feature in window.geojson['data'].features) {
			if (window.geojson['data'].features[feature].properties.id === id) {
				let selected_feature = {
					type: "FeatureCollection",
					features: [window.geojson['data'].features[feature]]
				}

				window.map.getSource('selected').setData(selected_feature);
				if(zoom) {
					window.map.jumpTo({center: window.geojson['data'].features[feature].geometry.coordinates, zoom: zoom});
				}
			}
		}
	}

	window.map.clickEvent = function (options) {
		// hook,add_point,layer
		// merge options with defaults
		options = Object.assign({
			hook: null,
			layer: 'data',
			clear: true
		}, options);
		const callback = (event) => {
			if (options.add_point === true) {
				window.geojson[options.layer].features.push({
					"type": "Feature",
					"geometry": {"coordinates": [event.lngLat.lng, event.lngLat.lat], "type": "Point"},
					"properties": {"icon": "point"}
				});
				map.getSource(options.layer).setData(window.geojson[options.layer]);
			}
			options.hook([event.lngLat.lng, event.lngLat.lat], event);
		}

		if(options.clear===true) {
			for(let i in events) {
				window.map.off('click',events[i].hook);
			}
			events=[];
		}
		window.map.on('click', options.hook);
		events.push(options);
	}

	window.map.addGeojson = function (geojson, layer) {
		layer=layer||'data';
		window.geojson[layer] = geojson;
		queue.push(layer);
		process_queue()
	}
	// Clear a layer of all features
	window.map.clearLayer = function (layer) {
		layer=layer||'data';
		window.geojson[layer] = {"type":"FeatureCollection","features":[]};
		queue.push(layer);
		process_queue()

	}

	window.map.drawLineString = function (json) {
		if(json&&json.features&&json.features.length>0&&json.features[0].geometry&&json.features[0].geometry.coordinates&&json.features[0].geometry.coordinates.length>0) {
			let id=draw.add(json.features[0]);
			draw.changeMode("direct_select", {featureId:id[0]})
		} else {
			draw.changeMode("draw_line_string", {})
		}
	}

	window.map.getDrawnLineString = function () {
		let data=draw.getAll();
		return data;
	}

	window.map.clearDrawnLineString = function () {
		draw.deleteAll();
		draw.changeMode("draw_line_string", {})
	}

	function process_queue() {
		if(loaded&&queue.length>0) {
			if(params.cluster==='True') {
				clusterIndex.load(window.geojson['data'].features);
				map.getSource('clusters').setData(getClusters());
			} else {
				for(let layer in queue) {
					window.map.getSource(queue[layer]).setData(window.geojson[queue[layer]]);
					if (window.geojson[queue[layer]].features.length > 0) {
						if(params.fit === 'True') {
							const bbox = turf.bbox(window.geojson[queue[layer]]);
							window.map.fitBounds(bbox, {padding: params.padding, maxZoom: options.maxZoom});
						}
						if (params.location === 'True' && currentLocation) {
							checkNearPoints(currentLocation[0], currentLocation[1]);
						}
					}
				}
			}
			queue=[];
		}
	}

}