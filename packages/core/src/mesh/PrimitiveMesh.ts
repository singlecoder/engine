import { Vector2, Vector3 } from "@oasis-engine/math";
import { GLCapabilityType } from "../base/Constant";
import { Engine } from "../Engine";
import { ModelMesh } from "./ModelMesh";

/**
 * Used to generate common primitve meshes.
 */
export class PrimitiveMesh {
  /** The max number of indices that Uint16Array can support. */
  private static _uint16VertexLimit: number = 65535;

  /**
   * Create a sphere mesh.
   * @param engine - Engine
   * @param radius - Sphere radius
   * @param segments - Number of segments
   * @param accessible - Whether to access data later. If true, you can access the data anytime
   * @returns Sphere mesh
   */
  static createSphere(
    engine: Engine,
    radius: number = 0.5,
    segments: number = 12,
    accessible: boolean = false
  ): ModelMesh {
    const mesh = new ModelMesh(engine, "sphereModelMesh");
    segments = Math.max(2, Math.floor(segments));

    const count = segments + 1;
    const vertexCount = count * count;
    const rectangleCount = segments * segments;
    let indices: Uint16Array | Uint32Array = null;
    if (vertexCount > PrimitiveMesh._uint16VertexLimit) {
      if (engine.renderhardware.canIUse(GLCapabilityType.elementIndexUint)) {
        indices = new Uint32Array(rectangleCount * 6);
      } else {
        throw Error("The vertex count is over limit.");
      }
    } else {
      indices = new Uint16Array(rectangleCount * 6);
    }
    const thetaRange = Math.PI;
    const alphaRange = thetaRange * 2;
    const countReciprocal = 1.0 / count;
    const segmentsReciprocal = 1.0 / segments;

    const positions: Vector3[] = [];
    const normals: Vector3[] = [];
    const uvs: Vector2[] = [];

    let offset = 0;
    for (let i = 0; i < vertexCount; ++i) {
      const x = i % count;
      const y = (i * countReciprocal) | 0;
      const u = x * segmentsReciprocal;
      const v = y * segmentsReciprocal;
      const alphaDelta = u * alphaRange;
      const thetaDelta = v * thetaRange;
      const sinTheta = Math.sin(thetaDelta);

      let posX = -radius * Math.cos(alphaDelta) * sinTheta;
      let posY = radius * Math.cos(thetaDelta);
      let posZ = radius * Math.sin(alphaDelta) * sinTheta;

      // Position
      positions[offset] = new Vector3(posX, posY, posZ);
      // Normal
      normals[offset] = new Vector3(posX, posY, posZ);
      // Texcoord
      uvs[offset++] = new Vector2(u, v);
    }

    offset = 0;
    for (let i = 0; i < rectangleCount; ++i) {
      const x = i % segments;
      const y = (i * segmentsReciprocal) | 0;

      const a = y * count + x;
      const b = a + 1;
      const c = a + count;
      const d = c + 1;

      indices[offset++] = b;
      indices[offset++] = a;
      indices[offset++] = d;
      indices[offset++] = a;
      indices[offset++] = c;
      indices[offset++] = d;
    }

    mesh.setPositions(positions);
    mesh.setNormals(normals);
    mesh.setUVs(uvs);
    mesh.setIndices(indices);
    mesh.addSubMesh(0, indices.length);
    mesh.uploadData(!accessible);

    const { bounds } = mesh;
    bounds.min.setValue(-radius, -radius, -radius);
    bounds.max.setValue(radius, radius, radius);

    return mesh;
  }

  /**
   * Create a cuboid mesh.
   * @param engine - Engine
   * @param width - Cuboid width
   * @param height - Cuboid height
   * @param depth - Cuboid depth
   * @param accessible - Whether to access data later. If true, you can access the data anytime
   * @returns Cuboid mesh
   */
  static createCuboid(
    engine: Engine,
    width: number = 1,
    height: number = 1,
    depth: number = 1,
    accessible: boolean = true
  ): ModelMesh {
    const mesh = new ModelMesh(engine, "cuboidModelMesh");

    const halfWidth: number = width / 2;
    const halfHeight: number = height / 2;
    const halfDepth: number = depth / 2;

    const positions: Vector3[] = [];
    const normals: Vector3[] = [];
    const uvs: Vector2[] = [];

    // prettier-ignore
    // Up
    positions[0] = new Vector3(-halfWidth, halfHeight, -halfDepth);
    normals[0] = new Vector3(0, 1, 0);
    uvs[0] = new Vector2(0, 0);

    positions[1] = new Vector3(halfWidth, halfHeight, -halfDepth);
    normals[1] = new Vector3(0, 1, 0);
    uvs[1] = new Vector2(1, 0);

    positions[2] = new Vector3(halfWidth, halfHeight, halfDepth);
    normals[2] = new Vector3(0, 1, 0);
    uvs[2] = new Vector2(1, 1);

    positions[3] = new Vector3(-halfWidth, halfHeight, halfDepth);
    normals[3] = new Vector3(0, 1, 0);
    uvs[3] = new Vector2(0, 1);

    // Down
    positions[4] = new Vector3(-halfWidth, -halfHeight, -halfDepth);
    normals[4] = new Vector3(0, -1, 0);
    uvs[4] = new Vector2(0, 1);

    positions[5] = new Vector3(halfWidth, -halfHeight, -halfDepth);
    normals[5] = new Vector3(0, -1, 0);
    uvs[5] = new Vector2(1, 1);

    positions[6] = new Vector3(halfWidth, -halfHeight, halfDepth);
    normals[6] = new Vector3(0, -1, 0);
    uvs[6] = new Vector2(1, 0);

    positions[7] = new Vector3(-halfWidth, -halfHeight, halfDepth);
    normals[7] = new Vector3(0, -1, 0);
    uvs[7] = new Vector2(0, 0);

    // Left
    positions[8] = new Vector3(-halfWidth, halfHeight, -halfDepth);
    normals[8] = new Vector3(-1, 0, 0);
    uvs[8] = new Vector2(0, 0);

    positions[9] = new Vector3(-halfWidth, halfHeight, halfDepth);
    normals[9] = new Vector3(-1, 0, 0);
    uvs[9] = new Vector2(1, 0);

    positions[10] = new Vector3(-halfWidth, -halfHeight, halfDepth);
    normals[10] = new Vector3(-1, 0, 0);
    uvs[10] = new Vector2(1, 1);

    positions[11] = new Vector3(-halfWidth, -halfHeight, -halfDepth);
    normals[11] = new Vector3(-1, 0, 0);
    uvs[11] = new Vector2(0, 1);

    // Right
    positions[12] = new Vector3(halfWidth, halfHeight, -halfDepth);
    normals[12] = new Vector3(1, 0, 0);
    uvs[12] = new Vector2(1, 0);

    positions[13] = new Vector3(halfWidth, halfHeight, halfDepth);
    normals[13] = new Vector3(1, 0, 0);
    uvs[13] = new Vector2(0, 0);

    positions[14] = new Vector3(halfWidth, -halfHeight, halfDepth);
    normals[14] = new Vector3(1, 0, 0);
    uvs[14] = new Vector2(0, 1);

    positions[15] = new Vector3(halfWidth, -halfHeight, -halfDepth);
    normals[15] = new Vector3(1, 0, 0);
    uvs[15] = new Vector2(1, 1);

    // Front
    positions[16] = new Vector3(-halfWidth, halfHeight, halfDepth);
    normals[16] = new Vector3(0, 0, 1);
    uvs[16] = new Vector2(0, 0);

    positions[17] = new Vector3(halfWidth, halfHeight, halfDepth);
    normals[17] = new Vector3(0, 0, 1);
    uvs[17] = new Vector2(1, 0);

    positions[18] = new Vector3(halfWidth, -halfHeight, halfDepth);
    normals[18] = new Vector3(0, 0, 1);
    uvs[18] = new Vector2(1, 1);

    positions[19] = new Vector3(-halfWidth, -halfHeight, halfDepth);
    normals[19] = new Vector3(0, 0, 1);
    uvs[19] = new Vector2(0, 1);

    // Back
    positions[20] = new Vector3(-halfWidth, halfHeight, -halfDepth);
    normals[20] = new Vector3(0, 0, -1);
    uvs[20] = new Vector2(1, 0);

    positions[21] = new Vector3(halfWidth, halfHeight, -halfDepth);
    normals[21] = new Vector3(0, 0, -1);
    uvs[21] = new Vector2(0, 0);

    positions[22] = new Vector3(halfWidth, -halfHeight, -halfDepth);
    normals[22] = new Vector3(0, 0, -1);
    uvs[22] = new Vector2(0, 1);

    positions[23] = new Vector3(-halfWidth, -halfHeight, -halfDepth);
    normals[23] = new Vector3(0, 0, -1);
    uvs[23] = new Vector2(1, 1);

    const indices = new Uint16Array(36);

    // prettier-ignore
    // Up
    indices[0] = 0, indices[1] = 2, indices[2] = 1, indices[3] = 2, indices[4] = 0, indices[5] = 3,
    // Down
    indices[6] = 4, indices[7] = 6, indices[8] = 7, indices[9] = 6, indices[10] = 4, indices[11] = 5,
    // Left
    indices[12] = 8, indices[13] = 10, indices[14] = 9, indices[15] = 10, indices[16] = 8, indices[17] = 11,
    // Right
    indices[18] = 12, indices[19] = 14, indices[20] = 15, indices[21] = 14, indices[22] = 12, indices[23] = 13,
    // Front
    indices[24] = 16, indices[25] = 18, indices[26] = 17, indices[27] = 18, indices[28] = 16, indices[29] = 19,
    // Back
    indices[30] = 20, indices[31] = 22, indices[32] = 23, indices[33] = 22, indices[34] = 20, indices[35] = 21;

    mesh.setPositions(positions);
    mesh.setNormals(normals);
    mesh.setUVs(uvs);
    mesh.setIndices(indices);
    mesh.addSubMesh(0, indices.length);
    mesh.uploadData(!accessible);

    const { bounds } = mesh;
    bounds.min.setValue(-halfWidth, -halfHeight, -halfDepth);
    bounds.max.setValue(halfWidth, halfHeight, halfDepth);

    return mesh;
  }

  /**
   * Create a plane mesh.
   * @param engine - Engine
   * @param width - Plane width
   * @param height - Plane height
   * @param horizontalSegments - Plane horizontal segments
   * @param verticalSegments - Plane verticle segments
   * @param accessible - Whether to access data later. If true, you can access the data anytime
   * @returns Plane mesh
   */
  static createPlane(
    engine: Engine,
    width: number = 1,
    height: number = 1,
    horizontalSegments: number = 1,
    verticalSegments: number = 1,
    accessible: boolean = true
  ): ModelMesh {
    const mesh = new ModelMesh(engine, "planeModelMesh");
    horizontalSegments = Math.max(1, Math.floor(horizontalSegments));
    verticalSegments = Math.max(1, Math.floor(verticalSegments));

    const horizontalCount = horizontalSegments + 1;
    const verticalCount = verticalSegments + 1;
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const gridWidth = width / horizontalSegments;
    const gridHeight = height / verticalSegments;
    const vertexCount = horizontalCount * verticalCount;
    const rectangleCount = verticalSegments * horizontalSegments;
    let indices: Uint16Array | Uint32Array = null;
    if (vertexCount > PrimitiveMesh._uint16VertexLimit) {
      if (engine.renderhardware.canIUse(GLCapabilityType.elementIndexUint)) {
        indices = new Uint32Array(rectangleCount * 6);
      } else {
        throw Error("The vertex count is over limit.");
      }
    } else {
      indices = new Uint16Array(rectangleCount * 6);
    }
    const horizontalCountReciprocal = 1.0 / horizontalCount;
    const horizontalSegmentsReciprocal = 1.0 / horizontalSegments;
    const verticalSegmentsReciprocal = 1.0 / verticalSegments;

    const positions: Vector3[] = [];
    const normals: Vector3[] = [];
    const uvs: Vector2[] = [];

    let offset = 0;
    for (let i = 0; i < vertexCount; ++i) {
      const x = i % horizontalCount;
      const y = (i * horizontalCountReciprocal) | 0;

      // Position
      positions[offset] = new Vector3(x * gridWidth - halfWidth, y * gridHeight - halfHeight, 0);
      // Normal
      normals[offset] = new Vector3(0, 0, 1);
      // Texcoord
      uvs[offset++] = new Vector2(x * horizontalSegmentsReciprocal, 1 - y * verticalSegmentsReciprocal);
    }

    offset = 0;
    for (let i = 0; i < rectangleCount; ++i) {
      const x = i % horizontalSegments;
      const y = (i * horizontalSegmentsReciprocal) | 0;

      const a = y * horizontalCount + x;
      const b = a + 1;
      const c = a + horizontalCount;
      const d = c + 1;

      indices[offset++] = b;
      indices[offset++] = c;
      indices[offset++] = a;
      indices[offset++] = b;
      indices[offset++] = d;
      indices[offset++] = c;
    }

    mesh.setPositions(positions);
    mesh.setNormals(normals);
    mesh.setUVs(uvs);
    mesh.setIndices(indices);
    mesh.addSubMesh(0, indices.length);
    mesh.uploadData(!accessible);

    const { bounds } = mesh;
    bounds.min.setValue(-halfWidth, -halfHeight, 0);
    bounds.max.setValue(halfWidth, halfHeight, 0);

    return mesh;
  }

  /**
   * Create a cylinder mesh.
   * @param engine - Engine
   * @param radius - The radius of cap
   * @param height - The height of torso
   * @param radialSegments - Cylinder radial segments
   * @param heightSegments - Cylinder height segments
   * @param accessible - Whether to access data later. If true, you can access the data anytime
   * @returns Cylinder mesh
   */
  static createCylinder(
    engine: Engine,
    radius: number = 0.5,
    height: number = 2,
    radialSegments: number = 20,
    heightSegments: number = 1,
    accessible: boolean = true
  ): ModelMesh {
    const mesh = new ModelMesh(engine, "cylinderModelMesh");
    radialSegments = Math.floor(radialSegments);
    heightSegments = Math.floor(heightSegments);

    const radialCount = radialSegments + 1;
    const verticalCount = heightSegments + 1;
    const halfHeight = height * 0.5;
    const unitHeight = height / heightSegments;
    const torsoVertexCount = radialCount * verticalCount;
    const torsoRectangleCount = radialSegments * heightSegments;
    const capTriangleCount = radialSegments * 2;
    const totalVertexCount = torsoVertexCount + 2 + capTriangleCount;
    let indices: Uint16Array | Uint32Array = null;
    if (totalVertexCount > PrimitiveMesh._uint16VertexLimit) {
      if (engine.renderhardware.canIUse(GLCapabilityType.elementIndexUint)) {
        indices = new Uint32Array(torsoRectangleCount * 6 + capTriangleCount * 3);
      } else {
        throw Error("The vertex count is over limit.");
      }
    } else {
      indices = new Uint16Array(torsoRectangleCount * 6 + capTriangleCount * 3);
    }
    const radialCountReciprocal = 1.0 / radialCount;
    const radialSegmentsReciprocal = 1.0 / radialSegments;
    const heightSegmentsReciprocal = 1.0 / heightSegments;

    const positions: Vector3[] = [];
    const normals: Vector3[] = [];
    const uvs: Vector2[] = [];

    let verticesOffset = 0;
    let indicesOffset = 0;

    // Create torso
    const thetaStart = Math.PI;
    const thetaRange = Math.PI * 2;
    for (let i = 0; i < torsoVertexCount; ++i) {
      const x = i % radialCount;
      const y = (i * radialCountReciprocal) | 0;
      const u = x * radialSegmentsReciprocal;
      const v = y * heightSegmentsReciprocal;
      const theta = thetaStart + u * thetaRange;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      let posX = radius * sinTheta;
      let posY = y * unitHeight - halfHeight;
      let posZ = radius * cosTheta;

      // Position
      positions[verticesOffset] = new Vector3(posX, posY, posZ);
      // Normal
      normals[verticesOffset] = new Vector3(sinTheta, 0, cosTheta);
      // Texcoord
      uvs[verticesOffset++] = new Vector2(u, 1 - v);
    }

    for (let i = 0; i < torsoRectangleCount; ++i) {
      const x = i % radialSegments;
      const y = (i * radialSegmentsReciprocal) | 0;

      const a = y * radialCount + x;
      const b = a + 1;
      const c = a + radialCount;
      const d = c + 1;

      indices[indicesOffset++] = b;
      indices[indicesOffset++] = c;
      indices[indicesOffset++] = a;
      indices[indicesOffset++] = b;
      indices[indicesOffset++] = d;
      indices[indicesOffset++] = c;
    }

    // Bottom position
    positions[verticesOffset] = new Vector3(0, -halfHeight, 0);
    // Bottom normal
    normals[verticesOffset] = new Vector3(0, -1, 0);
    // Bottom texcoord
    uvs[verticesOffset++] = new Vector2(0.5, 0.5);

    // Top position
    positions[verticesOffset] = new Vector3(0, halfHeight, 0);
    // Top normal
    normals[verticesOffset] = new Vector3(0, 1, 0);
    // Top texcoord
    uvs[verticesOffset++] = new Vector2(0.5, 0.5);

    // Add cap vertices
    const diameterReciprocal = 1.0 / (radius * 2);
    for (let i = 0; i < radialSegments; ++i) {
      const curVertexIndex = i;
      const curPos = positions[curVertexIndex];
      const curPosX = curPos.x;
      const curPosZ = curPos.z;
      const u = curPosX * diameterReciprocal + 0.5;
      const v = curPosZ * diameterReciprocal + 0.5;

      // Bottom position
      positions[verticesOffset] = new Vector3(curPosX, -halfHeight, curPosZ);
      // Bottom normal
      normals[verticesOffset] = new Vector3(0, -1, 0);
      // Bottom texcoord
      uvs[verticesOffset++] = new Vector2(u, 1 - v);

      // Top position
      positions[verticesOffset] = new Vector3(curPosX, halfHeight, curPosZ);
      // Top normal
      normals[verticesOffset] = new Vector3(0, 1, 0);
      // Top texcoord
      uvs[verticesOffset++] = new Vector2(u, v);
    }

    // Add cap indices
    const topCapIndex = torsoVertexCount + 1;
    const bottomIndiceIndex = torsoVertexCount + 2;
    const topIndiceIndex = bottomIndiceIndex + 1;
    for (let i = 0; i < radialSegments; ++i) {
      const firstStride = i * 2;
      const secondStride = i === radialSegments - 1 ? 0 : firstStride + 2;

      // Bottom
      indices[indicesOffset++] = torsoVertexCount;
      indices[indicesOffset++] = bottomIndiceIndex + secondStride;
      indices[indicesOffset++] = bottomIndiceIndex + firstStride;

      // Top
      indices[indicesOffset++] = topCapIndex;
      indices[indicesOffset++] = topIndiceIndex + firstStride;
      indices[indicesOffset++] = topIndiceIndex + secondStride;
    }

    mesh.setPositions(positions);
    mesh.setNormals(normals);
    mesh.setUVs(uvs);
    mesh.setIndices(indices);
    mesh.addSubMesh(0, indices.length);
    mesh.uploadData(!accessible);

    const { bounds } = mesh;
    bounds.min.setValue(-radius, -halfHeight, -radius);
    bounds.max.setValue(radius, halfHeight, radius);

    return mesh;
  }
}
