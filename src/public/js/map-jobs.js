document.addEventListener("DOMContentLoaded", function() {
    var map = L.map('map').setView([20, 0], 2); // Set the view to a global view
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    var teamLocations = [
        { country: "Nicaragua", lat: 12.865416, lng: -85.207229, numero: 1 },
        { country: "República Dominicana", lat: 18.735693, lng: -70.162651, numero: 1 },
        { country: "Chile", lat: -35.675147, lng: -71.542969, numero: 1 },
        { country: "Ecuador", lat: -1.831239, lng: -78.183406, numero: 1 }
    ];
    
    teamLocations.forEach(function(location) {
        L.marker([location.lat, location.lng]).addTo(map)
            .bindPopup(location.country)
            .openPopup();
        
        // Add country with custom number to the ordered list below the map with Bulma styling
        var listItem = document.createElement('li');
        listItem.textContent = location.country + ": " + location.numero; // Display country and custom number
        listItem.classList.add('mb-2'); // Add margin-bottom for spacing
        document.getElementById('country-list').appendChild(listItem);
    });
});
