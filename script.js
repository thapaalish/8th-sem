const map = L.map("map").setView([27.7293, 85.3343], 8);
const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

let routingControl = null;

const jsonData = [
  {
    name: "Starting Point",
    city: "Kathmandu",
    province: "3",
    address: "Hundai service, kupondole",
    telephone: "01-5550380",
    type: ["car"],
    latitude: "27.68322",
    longitude: "85.31883",
    plugs: [
      {
        plug: "type1",
        power: "7.2Kw",
        typeplug: "DC",
      },
    ],
    amenities: ["wifi", "parking", "restroom"],
  },
  {
    name: "Temple",
    city: "Kathmandu",
    province: "3",
    address: "Hyundai Sales/Service Tinkune",
    telephone: "+97714111891",
    type: ["car"],
    latitude: "27.68042",
    longitude: "85.31747",
    plugs: [
      {
        plug: "type2",
        power: "7.2Kw",
        typeplug: "DC",
      },
    ],
  },
  {
    name: "Mall",
    city: "Pokhara",
    province: "3",
    address: "Lakeside Rd 6",
    telephone: "61460617",
    latitude: "27.6774",
    longitude: "85.3166",
  },
  {
    name: "Park",
    city: "Pokhara",
    province: "3",
    address: "Lakeside Rd 6",
    telephone: "61460617",
    latitude: "27.67825",
    longitude: "85.32106",
  },
  {
    name: "hotel",
    city: "Pokhara",
    province: "3",
    address: "Lakeside Rd 6",
    telephone: "61460617",
    latitude: "27.6743",
    longitude: "85.3208",
  },
  {
    name: "Ending Point",
    city: "Pokhara",
    province: "3",
    address: "Lakeside Rd 6",
    telephone: "61460617",
    latitude: "27.67415",
    longitude: "85.32439",
    amenities: [
      "wifi",
      "parking",
      "food",
      "coffee",
      "accomodation",
      "restroom",
    ],
  },
];

jsonData.forEach((station) => {
  let popupContent = `
    <h2>${station.name}</h2>
    <p>${station.address}, ${station.city}</p>
    <p>Phone: ${station.telephone}</p>
  `;

  const stationMarker = L.marker([station.latitude, station.longitude], {
    title: station.name,
    draggable: false,
  }).bindPopup(popupContent);

  stationMarker.addTo(map);

  stationMarker.on("click", function () {
    this.openPopup();
  });
});

let isCalculating = false;

function createRoute() {
  if (isCalculating) return;
  isCalculating = true;

  const startingPoint = jsonData.find(
    (station) => station.name === "Starting Point"
  );
  const endingPoint = jsonData.find(
    (station) => station.name === "Ending Point"
  );

  if (!startingPoint || !endingPoint) {
    alert("Starting or Ending Point not found in data.");
    isCalculating = false;
    return;
  }

  const intermediatePoints = jsonData.filter(
    (station) =>
      station.name !== "Starting Point" && station.name !== "Ending Point"
  );

  const waypoints = [L.latLng(startingPoint.latitude, startingPoint.longitude)];
  let currentPoint = startingPoint;

  async function calculateRoute() {
    const response = await fetch(
      "https://router.project-osrm.org/table/v1/driving/" +
        [startingPoint, ...intermediatePoints, endingPoint]
          .map((p) => `${p.longitude},${p.latitude}`)
          .join(";") +
        "?annotations=distance"
    );
    const data = await response.json();

    if (data.code !== "Ok") {
      alert("Error calculating route");
      isCalculating = false;
      return;
    }

    const distances = data.distances;
    const visited = new Array(intermediatePoints.length).fill(false);
    let currentIndex = 0;

    while (waypoints.length < jsonData.length) {
      let nearestIndex = -1;
      let nearestDistance = Infinity;

      for (let i = 0; i < intermediatePoints.length; i++) {
        if (!visited[i] && distances[currentIndex][i + 1] < nearestDistance) {
          nearestIndex = i;
          nearestDistance = distances[currentIndex][i + 1];
        }
      }

      if (nearestIndex === -1) break;

      visited[nearestIndex] = true;
      currentIndex = nearestIndex + 1;
      waypoints.push(
        L.latLng(
          intermediatePoints[nearestIndex].latitude,
          intermediatePoints[nearestIndex].longitude
        )
      );
    }

    waypoints.push(L.latLng(endingPoint.latitude, endingPoint.longitude));

    if (routingControl) {
      routingControl.setWaypoints(waypoints);
    } else {
      routingControl = L.Routing.control({
        waypoints: waypoints,
        createMarker: function (i, waypoint, n) {
          return L.marker(waypoint.latLng).bindPopup(
            i === 0 ? "Start" : i === n - 1 ? "End" : "Waypoint"
          );
        },
        router: L.Routing.osrmv1({
          serviceUrl: "https://router.project-osrm.org/route/v1",
        }),
      }).addTo(map);
    }

    isCalculating = false;
  }

  calculateRoute();
}

document.getElementById("center-button").addEventListener("click", createRoute);
