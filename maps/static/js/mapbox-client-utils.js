const map_search = (event, map_id) => {
	event.preventDefault()
	const searchInput = document.getElementById('map-search');
	const resultsContainer = document.getElementById('map-search-results');
	const query = searchInput.value;
	const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
	resultsContainer.innerHTML = '';

        fetch(url)
          .then(response => response.json())
          .then(results => {
            if (results.length > 0) {
              results.slice(0, 5).forEach(result => {
				  const item = document.createElement('div');
				  item.textContent = result.display_name;
				  item.addEventListener('click', () => {
					const lon = parseFloat(result.lon);
					const lat = parseFloat(result.lat);
					window.map[map_id].flyTo({ center: [lon, lat], zoom: 14 });
					resultsContainer.innerHTML = '';
				  });
				  resultsContainer.appendChild(item);
				});
              // window.map[map_id].flyTo({
              //   center: [lon, lat],
              //   zoom: 14
              // });


            } else {
              alert('Location not found!');
            }
          })
          .catch(err => {
            console.error('Geocoding error:', err);
          });

}