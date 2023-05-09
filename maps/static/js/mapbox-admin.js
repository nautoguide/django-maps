document.addEventListener('DOMContentLoaded', () => {
	document.addEventListener('formset:added', (event) => {
		let target=event.target.getElementsByClassName('init-widget');
		if (target&&target[0]) {
			mapboxAdminFromElement(target[0]);
		}
	});
});
function mapboxAdminFromElement(element) {
	const widgetId = element.id;
	const widgetValue = element.dataset.value;
	mapboxAdmin(widgetId, widgetValue);
}

function mapboxAdmin(widgetId, widgetValue) {
	//debugger;
	let options = {
		container: `${widgetId}`,
		style: '/mapfiles/?file=os-styles.json',
		maxZoom: 25,
		minZoom: 0,
		pitch: 0,
		//center: [-0.9307443, 50.7980974],
		center: [-3.510486, 50.395822] ,
		zoom: 10
	}

	const icons = [
		{"url": "/static/icons/point.png", "name": "point"}
	];

	const map = new maplibregl.Map(options);
	map.addControl(new maplibregl.NavigationControl());

	map.on('load', function () {
		loadIcons(map, icons);

		let point = widgetValue;
		const regex = /POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/;
		let points = point.match(regex);
		if (points&&points.length > 0) {
			let pointsArray = [parseFloat(points[1]), parseFloat(points[2])]
			if(pointsArray[1]!==0) {
				let pointJson = {
					"type": "Feature",
					"geometry": {"coordinates": [pointsArray[0], pointsArray[1]], "type": "Point"},
					"properties": {"icon": "point"}
				}

				map.getSource('data').setData({
					type: "FeatureCollection",
					features: [pointJson]
				});

				map.jumpTo({center: [pointsArray[0], pointsArray[1]]});
			}
		}
	});


	map.on('click', (event) => {
		console.log('Map clicked at:', event.lngLat);
		map.getSource('data').setData({
			type: "FeatureCollection",
			features: [{
				"type": "Feature",
				"geometry": {"coordinates": [event.lngLat.lng, event.lngLat.lat], "type": "Point"},
				"properties": {"icon": "point"}
			}]
		});
		let field = document.getElementById(widgetId.replace(/-map/,''));
		field.value = `POINT(${event.lngLat.lng} ${event.lngLat.lat})`;
	});

	function loadIcons(map, icons) {
		icons.forEach((icon) => {
			map.loadImage(icon.url, (error, image) => {
				if (error) {
					console.error('Error loading icon:', error);
					return;
				}

				// Add the image to the map
				if (!map.hasImage(icon.name)) {
					map.addImage(icon.name, image);
				}
			});
		});
	}
}