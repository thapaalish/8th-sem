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
    latitude: "27.68276",
    longitude: "85.31921",
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
    name: "hotel",
    city: "Pokhara",
    province: "3",
    address: "Lakeside Rd 6",
    telephone: "61460617",
    latitude: "27.6768",
    longitude: "85.3196",
  },
  {
    name: "hotel",
    city: "Pokhara",
    province: "3",
    address: "Lakeside Rd 6",
    telephone: "61460617",
    latitude: "27.6811",
    longitude: "85.3189",
  },
  {
    name: "hotel",
    city: "Pokhara",
    province: "3",
    address: "Lakeside Rd 6",
    telephone: "61460617",
    latitude: "27.68224",
    longitude: "85.31948",
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

  const points = [startingPoint, ...intermediatePoints, endingPoint];
  const waypoints = [L.latLng(startingPoint.latitude, startingPoint.longitude)];

  async function fetchDistanceMatrix() {
    const response = await fetch(
      "https://router.project-osrm.org/table/v1/driving/" +
        points.map((p) => `${p.longitude},${p.latitude}`).join(";") +
        "?annotations=distance"
    );
    const data = await response.json();

    if (data.code !== "Ok") {
      alert("Error fetching distance matrix");
      isCalculating = false;
      return null;
    }

    return data.distances;
  }

  function dijkstra(distances) {
    const numPoints = points.length;
    const visited = Array(numPoints).fill(false);
    const distancesFromStart = Array(numPoints).fill(Infinity);
    const previous = Array(numPoints).fill(null);
    distancesFromStart[0] = 0;

    for (let i = 0; i < numPoints - 1; i++) {
      let minDistance = Infinity;
      let minIndex = -1;

      for (let j = 0; j < numPoints; j++) {
        if (!visited[j] && distancesFromStart[j] <= minDistance) {
          minDistance = distancesFromStart[j];
          minIndex = j;
        }
      }

      visited[minIndex] = true;

      for (let j = 0; j < numPoints; j++) {
        if (
          !visited[j] &&
          distances[minIndex][j] &&
          distancesFromStart[minIndex] !== Infinity &&
          distancesFromStart[minIndex] + distances[minIndex][j] <
            distancesFromStart[j]
        ) {
          distancesFromStart[j] =
            distancesFromStart[minIndex] + distances[minIndex][j];
          previous[j] = minIndex;
        }
      }
    }

    return previous;
  }

  async function buildRoute() {
    const distances = await fetchDistanceMatrix();
    if (!distances) return;

    const previous = dijkstra(distances);
    let path = [];
    let current = points.length - 1;

    while (current !== null) {
      path.push(current);
      current = previous[current];
    }

    path = path.reverse();

    const routeWaypoints = path.map((index) =>
      L.latLng(points[index].latitude, points[index].longitude)
    );
    if (routingControl) {
      routingControl.setWaypoints(routeWaypoints);
    } else {
      routingControl = L.Routing.control({
        waypoints: routeWaypoints,
        createMarker: function (i, waypoint, n) {
          return L.marker(waypoint.latLng).bindPopup(
            i === 0 ? "Start" : i === n - 1 ? "End" : "Waypoint"
          );
        },
        router: L.Routing.osrmv1({
          serviceUrl: "https://router.project-osrm.org/route/v1",
          profile: "driving",
          options: {
            steps: true,
            overview: "full",
            alternatives: false,
            geometries: "polyline",
            annotations: true,
            radiuses: Array(routeWaypoints.length).fill(200),
          },
        }),
      }).addTo(map);
    }

    isCalculating = false;
  }

  buildRoute();
}

document.getElementById("center-button").addEventListener("click", createRoute);
