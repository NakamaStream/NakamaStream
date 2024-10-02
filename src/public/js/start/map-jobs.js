document.addEventListener("DOMContentLoaded", function() {
    var map = L.map('map').setView([20, 0], 2);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    var teamLocations = [
        { country: "Nicaragua", lat: 12.865416, lng: -85.207229, numero: 1 },
        { country: "República Dominicana", lat: 18.735693, lng: -70.162651, numero: 2 },
        { country: "Chile", lat: -35.675147, lng: -71.542969, numero: 1 },
        { country: "Ecuador", lat: -1.831239, lng: -78.183406, numero: 1 }
    ];
    
    teamLocations.forEach(function(location) {
        L.marker([location.lat, location.lng]).addTo(map)
            .bindPopup(location.country)
            .openPopup();
        
        var listItem = document.createElement('li');
        listItem.textContent = location.country + ": " + location.numero; 
        listItem.classList.add('mb-2');
        document.getElementById('country-list').appendChild(listItem);
    });
});