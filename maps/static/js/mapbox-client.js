//updated by Dave
function mapboxClient( params ) {
	let queue = [];
	let loaded = false;
	let currentLocation = null;
	let debug = false;
	params.maxZoom = parseInt(params.maxZoom);
	params.minZoom = parseInt(params.minZoom);
	params.zoom = parseInt(params.zoom);
	params.padding = parseInt(params.padding);

	// location stuff
	let latSum = 0;
	let lonSum = 0;
	let updateCount = 0;
	let intervalId;
	let firstUpdate = true;

	let draw_point_mode="add";
	let draw_actual_points=[];


	let events=[];
	const clusterIndex = new Supercluster({
		radius: 50,
		maxZoom: 14,
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
	if(params.locationErrorFunction!=='None') {
		params.locationErrorFunction=window[params.locationErrorFunction];
	}

	let page=1;
	params.center=JSON.parse(params.center);

	if (params.center && params.center.coordinates)
		params.center = params.center.coordinates;

	let options = {
		container: 'map',
		style: params.style,
		maxZoom: params.maxZoom,
		minZoom: params.minZoom,
		pitch: 0,
		center: params.center,
		zoom: params.zoom,
		attributionControl: false,
		clickTolerance: 1,
		dragPan: true,
		selected: 'False'
	}
	if (params.query !== 'None')
		params.json_url += '?' + params.query + '=' + document.getElementById(params.query).value;

	window.map = new maplibregl.Map(options);
	if(params.controls==='True') {
		window.map.addControl(new maplibregl.NavigationControl());
	}

	const canvas = map.getCanvasContainer();
	if(params.debug && params.debug==='True') {
		console.log('*********************** MAP DEBUG ***********************')
		console.log('Mapbox Client: ',params);
		window.map.showCollisionBoxes = true;
		window.map.showTileBoundaries = true;
	}


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
				filter: ['has', 'point_count'],
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
				filter: ['has', 'point_count'],
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
					"text-font": [params.cluster_font || "Open Sans Regular"],
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
					'icon-image': ['get', 'icon'], //get the icon from the icon field in the feature
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
			// event for when the map is zoomed

			if(params.json_url!=='None')
				clusterLoader();

		} else {
			window.map.reload_data();
			if(params.geojson&&params.geojson.type) {
				window.geojson['data'] = params.geojson;
				window.map.getSource('data').setData(params.geojson);
			}
		}
		process_queue();
	});

	if(params.debug && params.debug==='True') {
		window.map.on('click', () => {
			// Print the current map center and zoom
			console.log('Center:', window.map.getCenter());
			console.log('Zoom:', window.map.getZoom());
		});
	}

	window.map.reload_data = function ()
	{
		if(params.json_url!=='None') {
			fetch(params.json_url)
				.then(response => response.json())
				.then(data => {
					window.map.addGeojson(data);

				})
				.catch(error => console.error(error));
		}
	}

	// TODO triple check that this code is not used for NMRN
	// window.map.on('click', 'unclustered-points', (event) => {
	// 	setStep(event)
	// 	// const features = map.queryRenderedFeatures(event.point, {layers: ['unclustered-points']});
	// 	// if (features.length > 0 && click_url !== 'None') {
	// 	// 	params.click_url=params.click_url.replace('${id}',features[0].properties.id)
	// 	// 	window.location = params.click_url;
	// 	// }
	// 	// if( typeof params.clickFunction === 'function') {
	// 	// 	params.clickFunction(features[0].properties.id);
	// 	// }
	// });

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
			// Make a random uuid to use as the image name
			const uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
			window.map.loadImage(icon.url+"?cacheblock="+uuid, (error, image) => {
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
		if (typeof params.locationErrorFunction === 'function') {
			params.locationErrorFunction(error.message);
		}
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
				if(data.more===undefined || data.more===false) {
					let element = document.getElementById("map_spin");
					if(element) {
						element.classList.add("hidden")
					}
					window.map.zoomToExtent()

				} else {
					page++;
					map.triggerRepaint();
					setTimeout(clusterLoader,100);
				}

			}).catch(error => console.error(error));
	}

	function filterLoader() {
		fetch(params.json_url, {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(window.map_filter)
		}).then(response => response.json())
			.then(data => {
				window.geojson['data'].features=data.features;
				clusterIndex.load(window.geojson['data'].features);
				map.getSource('clusters').setData(getClusters());
				map.triggerRepaint()
				map.zoomToExtent()

			}).catch(error => console.error(error));
	}

	function pointDecoder(point) {
		let decoded_point=point;
		if(typeof decoded_point === 'string') {
			    // Use a regular expression to match the coordinates rather than replace as it copes with SRID
				const regex = /POINT\s*\(\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s*\)/;
				const match = point.match(regex);
				if (match) {
					const longitude = parseFloat(match[1]);
					const latitude = parseFloat(match[2]);
					return [longitude, latitude];
				} else {
					decoded_point = JSON.parse(decoded_point)
					return decoded_point.coordinates;
				}
			}
		logDebug(`${point} does not seem valid`);
	}
	// External functions

	window.map.filterLoader = filterLoader;

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
		window.map.flyTo({center: point, zoom: zoom});
	}

	window.map.zoomToExtent = function (layer) {
		layer=layer||'data';
		const bbox = turf.bbox(window.geojson[layer]);
		if(bbox[0]!==Infinity)
			window.map.fitBounds(bbox, {padding: params.padding, maxZoom: options.maxZoom})
	}

	window.map.clearSelected = function (id,zoom) {
		window.map.clearLayer('selected');
	}

	window.map.setSelected = function (id,zoom) {
		for (let feature in window.geojson['data'].features) {
			// Find the feature with the matching id but its not typed
			if (window.geojson['data'].features[feature].properties.id == id) {
				params.selected='False';

				let selected_feature = {
					type: "FeatureCollection",
					features: [window.geojson['data'].features[feature]]
				}
				window.map.addGeojson(selected_feature, 'selected');
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

	window.map.deleteFeature = function (id, layer) {
		layer=layer||'data';
		for(let i in window.geojson[layer].features) {
			if(window.geojson[layer].features[i].properties.id===id) {
				window.geojson[layer].features.splice(i,1);
				queue.push(layer);
				process_queue()
				return;
			}
		}
	}

	window.map.addFeature = function (feature, layer, replaceId) {
		layer=layer||'data';
		if(replaceId) {
			for(let i in window.geojson[layer].features) {
				if(window.geojson[layer].features[i].properties.id===replaceId) {
					window.geojson[layer].features[i].properties=feature.properties;
					queue.push(layer);
					process_queue()
					return;
				}
			}
		}
		window.geojson[layer].features.push(feature);
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

	window.map.LineDrawMode = function (json) {
		let moving_point=null;
		window.geojson["draw-end-points"]={"type":"FeatureCollection","features":[]};
		draw_actual_points=[];

		function onMove(e) {
			const coords = e.lngLat;
			draw_actual_points[moving_point]=[coords.lng, coords.lat];
			_drawLine();
			canvas.style.cursor = 'grabbing';
		}

		function onUp(e) {
			canvas.style.cursor = '';
			map.off('mousemove', onMove);
			map.off('touchmove', onMove);
		}


		map.on('mousedown', 'draw-end-points', (e) => {
			e.preventDefault();
			if(e.originalEvent.which===1) {
				// left click
				moving_point = e.features[0].properties.actual_index;
				canvas.style.cursor = 'grab';
				map.on('mousemove', onMove);
				map.once('mouseup', onUp);
			}
			if(e.originalEvent.which===3) {
				// right click
				draw_actual_points.splice(e.features[0].properties.actual_index,1);
				_drawLine();
			}
		});

		map.on('mousedown', 'draw-mid-points', (e) => {
			e.preventDefault();
			if(e.originalEvent.which===1) {
				// add a new point at the midpoint in the array
				draw_actual_points.splice(e.features[0].properties.actual_index + 1, 0, [e.lngLat.lng, e.lngLat.lat]);
				_drawLine();
				moving_point = e.features[0].properties.actual_index + 1;
				canvas.style.cursor = 'grab';
				map.on('mousemove', onMove);
				map.once('mouseup', onUp);
			}
		});

		// json contains a line string we need to convert to points in draw_actual_points
		if(json&&json.features&&json.features.length>0&&json.features[0].geometry&&json.features[0].geometry.coordinates&&json.features[0].geometry.coordinates.length>0) {
			draw_actual_points=json.features[0].geometry.coordinates;
			// Create a line between all the points
			let line = {
				type: "Feature",
				geometry: {
					type: "LineString",
					coordinates: draw_actual_points
				}
			};
			// Draw the line on the map
			window.map.getSource("draw-vertex").setData(line);
			_drawLine();
		}


		function addPoint(e) {
			let point = [e.lngLat.lng, e.lngLat.lat];
			const features = window.map.queryRenderedFeatures(e.point, {layers: ['draw-end-points']});

			if(draw_point_mode==="add") {
				if (features.length > 0) {
					// This is a move then handled else where
				} else {
					draw_actual_points.push(point);
					// Create a line between all the points
					_drawLine();
				}
			} else {
				// Delete mode
				// Find any points within 10 pixels of the click
				if (features.length > 0) {
					// Delete the point
					// find the point in draw_actual_points using the coordinates
					for(let i in draw_actual_points) {
						// fuzzy match of coordinates by 0.0001

						if(_fuzzyMatch(draw_actual_points[i][0],features[0].geometry.coordinates[0])&&_fuzzyMatch(draw_actual_points[i][1],features[0].geometry.coordinates[1])) {
							draw_actual_points.splice(i,1);
							break;
						}
					}
					_drawLine();
				}
			}
		}
		window.map.clickEvent({"hook":addPoint})
	}

	function _fuzzyMatch(point1,point2,precision) {
		precision=precision||0.0001;
		if(point1===point2&&point1===point2)
			return true;
		if(point1-precision<=point2&&point1+precision>=point2&&point1-precision<=point2&&point1+precision>=point2)
			return true;
		return false;
	}

	function _findMidpoint(pointA, pointB) {
		return [(pointA[0] + pointB[0]) / 2, (pointA[1] + pointB[1]) / 2];
	}

	function _drawLine() {
		let line = {
			type: "Feature",
			geometry: {
				type: "LineString",
				coordinates: draw_actual_points
			}
		};
		// Draw the line on the map
		window.geojson["draw-end-points"]={"type":"FeatureCollection","features":[]};
		window.geojson["draw-mid-points"]={"type":"FeatureCollection","features":[]};

		// Make the actual points geojson
		for(let i in draw_actual_points) {
			window.geojson["draw-end-points"].features.push({
				"type": "Feature",
				"geometry": {"coordinates": draw_actual_points[i], "type": "Point"},
				"properties": {"actual_index": i }
			});
		}

		// Make the mid points geojson
		for(let i=0;i<draw_actual_points.length-1;i++) {
			let mid_point=_findMidpoint(draw_actual_points[i],draw_actual_points[i+1]);
			window.geojson["draw-mid-points"].features.push({
				"type": "Feature",
				"geometry": {"coordinates": [mid_point[0],mid_point[1]], "type": "Point"},
				"properties": {"actual_index": i }
			});
		}

		map.getSource("draw-mid-points").setData(window.geojson["draw-mid-points"]);
		map.getSource("draw-end-points").setData(window.geojson["draw-end-points"]);
		window.map.getSource("draw-vertex").setData(line);

	}


	window.map.toggleDeleteMode = function () {
		if(draw_point_mode==="add")
			draw_point_mode="delete";
		else
			draw_point_mode="add";
	}

	window.map.getDrawnLineString = function () {
		// TODO Convert
		let data= {"type":"FeatureCollection","features":[{
			type: "Feature",
			geometry: {
				type: "LineString",
				coordinates: draw_actual_points
			}
		}]};
		return data;
	}

	window.map.clearDrawnLineString = function () {
		draw_actual_points=[];
		_drawLine();
	}

	// Update param function
	window.map.updateParam = function (key, value) {
		params[key] = value;
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
					if(params.selected!=='False') {
						window.map.setSelected(params.selected,14);
					}
				}
			}
			queue=[];
		}
	}
}