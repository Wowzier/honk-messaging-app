import { LocationData, RouteWaypoint } from '@/types';
import { calculateDistance, calculateBearing, calculateDestination } from '@/utils/distance';

/**
 * Terrain types that affect flight difficulty
 */
export enum TerrainType {
  OCEAN = 'ocean',
  LAND = 'land',
  MOUNTAIN = 'mountain',
  DESERT = 'desert',
  FOREST = 'forest',
  URBAN = 'urban'
}

/**
 * Terrain difficulty modifiers for flight speed
 */
export const TERRAIN_MODIFIERS: Record<TerrainType, number> = {
  [TerrainType.OCEAN]: 1.2,     // Easier - 20% speed boost
  [TerrainType.LAND]: 1.0,      // Baseline
  [TerrainType.MOUNTAIN]: 0.7,  // Harder - 30% speed reduction
  [TerrainType.DESERT]: 0.8,    // Harder - 20% speed reduction
  [TerrainType.FOREST]: 0.9,    // Slightly harder - 10% speed reduction
  [TerrainType.URBAN]: 0.95     // Slightly harder - 5% speed reduction
};

/**
 * Graph node representing a waypoint in the flight route
 */
export interface GraphNode {
  id: string;
  location: LocationData;
  terrain: TerrainType;
  altitude: number;
}

/**
 * Graph edge representing a connection between waypoints
 */
export interface GraphEdge {
  from: string;
  to: string;
  distance: number;
  cost: number;
  terrain_modifier: number;
}

/**
 * Result of Dijkstra's algorithm pathfinding
 */
export interface PathResult {
  path: GraphNode[];
  totalDistance: number;
  totalCost: number;
  waypoints: RouteWaypoint[];
}

/**
 * Flight routing service implementing Dijkstra's algorithm
 */
export class FlightRoutingService {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge[]> = new Map();

  /**
   * Generate waypoints along a great circle route between two points
   */
  generateWaypoints(start: LocationData, end: LocationData, maxSegmentDistance: number = 500): GraphNode[] {
    const totalDistance = calculateDistance(start, end);
    
    // Handle identical or very close locations
    if (totalDistance < 0.1) { // Less than 100m
      return [
        {
          id: `waypoint_0`,
          location: start,
          terrain: this.getTerrainType(start),
          altitude: this.calculateAltitude(start)
        },
        {
          id: `waypoint_1`,
          location: end,
          terrain: this.getTerrainType(end),
          altitude: this.calculateAltitude(end)
        }
      ];
    }
    
    const bearing = calculateBearing(start, end);
    
    // Calculate number of waypoints needed
    const numSegments = Math.max(1, Math.ceil(totalDistance / maxSegmentDistance));
    const segmentDistance = totalDistance / numSegments;
    
    const waypoints: GraphNode[] = [];
    
    // Add start point
    waypoints.push({
      id: `waypoint_0`,
      location: start,
      terrain: this.getTerrainType(start),
      altitude: this.calculateAltitude(start)
    });
    
    // Generate intermediate waypoints (only if we have more than one segment)
    if (numSegments > 1) {
      for (let i = 1; i < numSegments; i++) {
        const distance = i * segmentDistance;
        const location = calculateDestination(start, distance, bearing);
        
        waypoints.push({
          id: `waypoint_${i}`,
          location,
          terrain: this.getTerrainType(location),
          altitude: this.calculateAltitude(location)
        });
      }
    }
    
    // Add end point
    waypoints.push({
      id: `waypoint_${numSegments}`,
      location: end,
      terrain: this.getTerrainType(end),
      altitude: this.calculateAltitude(end)
    });
    
    return waypoints;
  }

  /**
   * Build graph data structure with nodes and weighted edges
   */
  buildGraph(waypoints: GraphNode[]): void {
    // Clear existing graph
    this.nodes.clear();
    this.edges.clear();
    
    // Add all nodes
    waypoints.forEach(node => {
      this.nodes.set(node.id, node);
      this.edges.set(node.id, []);
    });
    
    // Create edges between consecutive waypoints
    for (let i = 0; i < waypoints.length - 1; i++) {
      const currentNode = waypoints[i];
      const nextNode = waypoints[i + 1];
      this.addEdge(currentNode, nextNode);
      
      // For longer routes, also connect to waypoints that are 2-3 steps ahead
      // This allows for alternative routing, but only if we have enough waypoints
      if (waypoints.length > 4) {
        for (let j = i + 2; j < Math.min(i + 3, waypoints.length); j++) {
          const alternativeNode = waypoints[j];
          const distance = calculateDistance(currentNode.location, alternativeNode.location);
          const directDistance = calculateDistance(currentNode.location, nextNode.location);
          
          // Only add edge if it's not too much of a detour (within 30% extra distance)
          if (distance < directDistance * 1.3) {
            this.addEdge(currentNode, alternativeNode);
          }
        }
      }
    }
  }

  /**
   * Add a weighted edge between two nodes
   */
  private addEdge(from: GraphNode, to: GraphNode): void {
    const distance = calculateDistance(from.location, to.location);
    const terrainModifier = this.calculateTerrainModifier(from.terrain, to.terrain);
    const altitudeModifier = this.calculateAltitudeModifier(from.altitude, to.altitude);
    
    // Cost considers distance, terrain difficulty, and altitude changes
    const cost = distance / (terrainModifier * altitudeModifier);
    
    const edge: GraphEdge = {
      from: from.id,
      to: to.id,
      distance,
      cost,
      terrain_modifier: terrainModifier
    };
    
    const fromEdges = this.edges.get(from.id) || [];
    fromEdges.push(edge);
    this.edges.set(from.id, fromEdges);
  }

  /**
   * Implement Dijkstra's algorithm for optimal path finding
   */
  findOptimalPath(startId: string, endId: string): PathResult | null {
    if (!this.nodes.has(startId) || !this.nodes.has(endId)) {
      return null;
    }

    // Handle case where start and end are the same
    if (startId === endId) {
      const node = this.nodes.get(startId)!;
      return {
        path: [node],
        totalDistance: 0,
        totalCost: 0,
        waypoints: [{
          latitude: node.location.latitude,
          longitude: node.location.longitude,
          altitude: node.altitude,
          timestamp: new Date()
        }]
      };
    }

    // Initialize distances and previous nodes
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    // Set initial distances
    for (const nodeId of this.nodes.keys()) {
      distances.set(nodeId, nodeId === startId ? 0 : Infinity);
      previous.set(nodeId, null);
      unvisited.add(nodeId);
    }

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currentNode: string | null = null;
      let minDistance = Infinity;
      
      for (const nodeId of unvisited) {
        const distance = distances.get(nodeId) || Infinity;
        if (distance < minDistance) {
          minDistance = distance;
          currentNode = nodeId;
        }
      }

      if (currentNode === null || minDistance === Infinity) {
        break; // No path exists
      }

      unvisited.delete(currentNode);

      // If we reached the destination, we can stop
      if (currentNode === endId) {
        break;
      }

      // Update distances to neighbors
      const edges = this.edges.get(currentNode) || [];
      for (const edge of edges) {
        if (unvisited.has(edge.to)) {
          const newDistance = minDistance + edge.cost;
          const currentDistance = distances.get(edge.to) || Infinity;
          
          if (newDistance < currentDistance) {
            distances.set(edge.to, newDistance);
            previous.set(edge.to, currentNode);
          }
        }
      }
    }

    // Check if we found a path to the destination
    if (distances.get(endId) === Infinity) {
      return null;
    }

    // Reconstruct path
    const path = this.reconstructPath(previous, startId, endId);
    if (path.length === 0) {
      return null;
    }

    // Calculate total distance and cost
    let totalDistance = 0;
    const totalCost = distances.get(endId) || 0;
    
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      totalDistance += calculateDistance(from.location, to.location);
    }

    // Convert to RouteWaypoints
    const waypoints: RouteWaypoint[] = path.map((node, index) => ({
      latitude: node.location.latitude,
      longitude: node.location.longitude,
      altitude: node.altitude,
      timestamp: new Date(Date.now() + index * 60000) // Placeholder timestamps
    }));

    return {
      path,
      totalDistance,
      totalCost,
      waypoints
    };
  }

  /**
   * Reconstruct the optimal path from Dijkstra's algorithm results
   */
  private reconstructPath(
    previous: Map<string, string | null>,
    startId: string,
    endId: string
  ): GraphNode[] {
    const path: GraphNode[] = [];
    let currentId: string | null = endId;
    const visited = new Set<string>();

    while (currentId !== null && !visited.has(currentId)) {
      visited.add(currentId);
      const node = this.nodes.get(currentId);
      if (node) {
        path.unshift(node);
      }
      
      if (currentId === startId) {
        break;
      }
      
      currentId = previous.get(currentId) || null;
    }

    // Verify we have a complete path from start to end
    if (path.length === 0 || path[0].id !== startId || path[path.length - 1].id !== endId) {
      return [];
    }

    return path;
  }

  /**
   * Calculate terrain type based on location (simplified implementation)
   */
  private getTerrainType(location: LocationData): TerrainType {
    // Simplified terrain detection based on coordinates
    // In a real implementation, this would use geographic data services
    
    const { latitude, longitude } = location;
    
    // Ocean detection (very simplified)
    if (this.isOverOcean(latitude, longitude)) {
      return TerrainType.OCEAN;
    }
    
    // Mountain ranges (simplified detection)
    if (this.isOverMountains(latitude, longitude)) {
      return TerrainType.MOUNTAIN;
    }
    
    // Desert regions (simplified detection)
    if (this.isOverDesert(latitude, longitude)) {
      return TerrainType.DESERT;
    }
    
    // Default to land
    return TerrainType.LAND;
  }

  /**
   * Simplified ocean detection
   */
  private isOverOcean(latitude: number, longitude: number): boolean {
    // Very basic ocean detection - in reality would use geographic data
    // Atlantic Ocean (more specific bounds)
    if (longitude > -60 && longitude < -10 && latitude > 10 && latitude < 60) {
      return true;
    }
    // Pacific Ocean (more specific bounds)
    if ((longitude > 140 || longitude < -140) && Math.abs(latitude) < 60) {
      return true;
    }
    // Indian Ocean
    if (longitude > 60 && longitude < 100 && latitude > -40 && latitude < 20) {
      return true;
    }
    return false;
  }

  /**
   * Simplified mountain detection
   */
  private isOverMountains(latitude: number, longitude: number): boolean {
    // Rocky Mountains (more specific)
    if (longitude > -115 && longitude < -105 && latitude > 35 && latitude < 45) {
      return true;
    }
    // Alps (more specific)
    if (longitude > 6 && longitude < 14 && latitude > 45.5 && latitude < 47.5) {
      return true;
    }
    // Himalayas (more specific)
    if (longitude > 75 && longitude < 85 && latitude > 27 && latitude < 32) {
      return true;
    }
    return false;
  }

  /**
   * Simplified desert detection
   */
  private isOverDesert(latitude: number, longitude: number): boolean {
    // Sahara (more specific)
    if (longitude > -5 && longitude < 25 && latitude > 18 && latitude < 28) {
      return true;
    }
    // Arabian Desert (more specific)
    if (longitude > 38 && longitude < 52 && latitude > 18 && latitude < 28) {
      return true;
    }
    // Southwestern US deserts (more specific, avoid overlap with mountains)
    if (longitude > -118 && longitude < -108 && latitude > 28 && latitude < 38) {
      return true;
    }
    return false;
  }

  /**
   * Calculate altitude based on terrain type
   */
  private calculateAltitude(location: LocationData): number {
    const terrain = this.getTerrainType(location);
    
    switch (terrain) {
      case TerrainType.OCEAN:
        return 100; // Low altitude over water
      case TerrainType.MOUNTAIN:
        return 3000; // High altitude over mountains
      case TerrainType.DESERT:
        return 1000; // Medium altitude over desert
      case TerrainType.FOREST:
        return 500; // Low-medium altitude over forest
      case TerrainType.URBAN:
        return 800; // Medium altitude over cities
      default:
        return 600; // Default altitude for land
    }
  }

  /**
   * Calculate terrain modifier for flight speed
   */
  private calculateTerrainModifier(fromTerrain: TerrainType, toTerrain: TerrainType): number {
    // Use average of both terrain modifiers
    return (TERRAIN_MODIFIERS[fromTerrain] + TERRAIN_MODIFIERS[toTerrain]) / 2;
  }

  /**
   * Calculate altitude change modifier
   */
  private calculateAltitudeModifier(fromAltitude: number, toAltitude: number): number {
    const altitudeChange = Math.abs(toAltitude - fromAltitude);
    
    // Penalty for large altitude changes
    if (altitudeChange > 2000) {
      return 0.8; // 20% speed reduction
    } else if (altitudeChange > 1000) {
      return 0.9; // 10% speed reduction
    }
    
    return 1.0; // No penalty for small altitude changes
  }

  /**
   * Calculate optimal route between two locations
   */
  calculateRoute(start: LocationData, end: LocationData): PathResult | null {
    try {
      // Generate waypoints along great circle route
      const waypoints = this.generateWaypoints(start, end);
      
      if (waypoints.length === 0) {
        return null;
      }

      // For simple cases (2 waypoints), return direct route
      if (waypoints.length === 2) {
        const totalDistance = calculateDistance(start, end);
        const routeWaypoints: RouteWaypoint[] = waypoints.map((node, index) => ({
          latitude: node.location.latitude,
          longitude: node.location.longitude,
          altitude: node.altitude,
          timestamp: new Date(Date.now() + index * 60000)
        }));

        return {
          path: waypoints,
          totalDistance,
          totalCost: totalDistance, // Simple cost = distance for direct routes
          waypoints: routeWaypoints
        };
      }
      
      // Build graph with waypoints
      this.buildGraph(waypoints);
      
      // Find optimal path using Dijkstra's algorithm
      const startId = waypoints[0].id;
      const endId = waypoints[waypoints.length - 1].id;
      
      return this.findOptimalPath(startId, endId);
    } catch (error) {
      console.error('Error calculating route:', error);
      return null;
    }
  }

  /**
   * Recalculate route with updated conditions (for weather changes)
   */
  recalculateRoute(
    currentPosition: LocationData,
    destination: LocationData,
    avoidAreas?: LocationData[]
  ): PathResult | null {
    // Generate new waypoints from current position
    const waypoints = this.generateWaypoints(currentPosition, destination);
    
    // Filter out waypoints in avoid areas if specified
    if (avoidAreas && avoidAreas.length > 0) {
      const filteredWaypoints = waypoints.filter(waypoint => {
        return !avoidAreas.some(avoidArea => {
          const distance = calculateDistance(waypoint.location, avoidArea);
          return distance < 100; // Avoid areas within 100km
        });
      });
      
      // If we filtered out too many waypoints, use original route
      if (filteredWaypoints.length < 2) {
        return this.calculateRoute(currentPosition, destination);
      }
      
      this.buildGraph(filteredWaypoints);
      return this.findOptimalPath(filteredWaypoints[0].id, filteredWaypoints[filteredWaypoints.length - 1].id);
    }
    
    return this.calculateRoute(currentPosition, destination);
  }
}

/**
 * Singleton instance of the routing service
 */
export const flightRoutingService = new FlightRoutingService();