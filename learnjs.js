let isCalculating = false;

// Function to create a route
function createRoute() {
  // Prevents multiple simultaneous route calculations
  if (isCalculating) return;
  isCalculating = true;

  // Find starting and ending points from the data
  const startingPoint = jsonData.find(scenic => scenic.name === "Starting Point");
  const endingPoint = jsonData.find(scenic => scenic.name === "Ending Point");

  // Check if starting or ending points are not found
  if (!startingPoint || !endingPoint) {
    alert("Starting or Ending Point not found in data.");
    isCalculating = false;
    return;
  }

  // Filter out intermediate points
  const intermediatePoints = jsonData.filter(
    scenic => scenic.name !== "Starting Point" && scenic.name !== "Ending Point"
  );

  // Create an array of points with starting, intermediate, and ending points
  const points = [startingPoint, ...intermediatePoints, endingPoint];
  const waypoints = [L.latLng(startingPoint.latitude, startingPoint.longitude)];

  // Function to fetch distance matrix from OSRM
  async function fetchDistanceMatrix() {
    const response = await fetch(
      "https://router.project-osrm.org/table/v1/driving/" +
      points.map(p => `${p.longitude},${p.latitude}`).join(";") +
      "?annotations=distance"
    );
    const data = await response.json();

    // Check for errors in fetching distance matrix
    if (data.code !== "Ok") {
      alert("Error fetching distance matrix");
      isCalculating = false;
      return null;
    }

    return data.distances;
  }

  // Dijkstra's algorithm to find the shortest path
  function dijkstra(distances) {
    const numPoints = points.length; // Number of points (nodes) in the graph
    const visited = Array(numPoints).fill(false); // Array to track visited nodes
    const distancesFromStart = Array(numPoints).fill(Infinity); // Array to store shortest distances from starting point
    const previous = Array(numPoints).fill(null); // Array to store previous node in shortest path
    distancesFromStart[0] = 0; // Distance from start to itself is 0
  
    // Loop to find shortest path for all points
    for (let i = 0; i < numPoints - 1; i++) {
      let minDistance = Infinity;
      let minIndex = -1;
  
      // Find the node with the minimum distance from the start that hasn't been visited
      for (let j = 0; j < numPoints; j++) {
        if (!visited[j] && distancesFromStart[j] <= minDistance) {
          minDistance = distancesFromStart[j];
          minIndex = j;
        }
      }
  
      visited[minIndex] = true; // Mark the node as visited
  
      // Update distances to adjacent nodes if a shorter path is found
      for (let j = 0; j < numPoints; j++) {
        if (
          !visited[j] &&
          distances[minIndex][j] && // Ensure there's a connection between nodes
          distancesFromStart[minIndex] !== Infinity && // Ensure current node has been reached
          distancesFromStart[minIndex] + distances[minIndex][j] < distancesFromStart[j] // Check if shorter path found
        ) {
          distancesFromStart[j] = distancesFromStart[minIndex] + distances[minIndex][j]; // Update shortest distance
          previous[j] = minIndex; // Set previous node in the shortest path
        }
      }
    }
  
    return previous; // Return array of previous nodes for shortest paths
  }
  

  // Function to build the route
// Async function to build the route
async function buildRoute() {
    // Fetch distance matrix asynchronously
    const distances = await fetchDistanceMatrix();
    
    if (!distances) return; // Exit function if distances are not available
  
    // Compute shortest paths using Dijkstra's algorithm
    const previous = dijkstra(distances);
  
    // Construct the route based on the computed shortest paths
    let path = [];
    let current = points.length - 1; // Start from the ending point
  
    // Trace back the shortest path using the 'previous' array
    while (current !== null) {
      path.push(current);
      current = previous[current];
    }
  
    path = path.reverse(); // Reverse the path to start from the beginning
  
    // Convert path indices to actual waypoints (latitude and longitude)
    const routeWaypoints = path.map(index =>
      L.latLng(points[index].latitude, points[index].longitude)
    );
  
    // Create or update the routing control on the map
    if (routingControl) {
      routingControl.setWaypoints(routeWaypoints); // Update existing routing control with new waypoints
    } else {
      routingControl = L.Routing.control({
        waypoints: routeWaypoints, // Set waypoints for the route
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
      }).addTo(map); // Add routing control to the map
    }
  
    isCalculating = false; // Reset the calculating flag
  }
  
  // Call the buildRoute function to start building the route
  buildRoute();
  
}

// Add event listener to the button
document.getElementById("center-button").addEventListener("click", createRoute);
