import { SpriteMaskInteraction, SpriteRenderer } from "../2d";
import { Engine } from "../Engine";
import { VertexElementFormat } from "../graphic/enums/VertexElementFormat";
import { VertexElement } from "../graphic/VertexElement";
import { Shader } from "../shader";
import { ShaderProperty } from "../shader/ShaderProperty";
import { Basic2DBatcher } from "./Basic2DBatcher";
import { SpriteElement } from "./SpriteElement";
import { SpriteMaskManager } from "./SpriteMaskManager";

/**
 * @internal
 */
export class SpriteBatcher extends Basic2DBatcher {
  private static _textureProperty: ShaderProperty = Shader.getPropertyByName("u_spriteTexture");

  drawSprite(spriteElement: SpriteElement): void {
    const len = spriteElement.positions.length;
    if (this._vertexCount + len > Basic2DBatcher.MAX_VERTEX_COUNT) {
      this.flush(spriteElement.camera.engine);
    }

    this._vertexCount += len;
    this._batchedQueue[this._elementCount++] = spriteElement;
  }

  _createVertexElements(vertexElements: VertexElement[]): number {
    vertexElements[0] = new VertexElement("POSITION", 0, VertexElementFormat.Vector3, 0);
    vertexElements[1] = new VertexElement("TEXCOORD_0", 12, VertexElementFormat.Vector2, 0);
    vertexElements[2] = new VertexElement("COLOR_0", 20, VertexElementFormat.Vector4, 0);
    return 36;
  }

  _canBatch(preSpriteElement: SpriteElement, curSpriteElement: SpriteElement): boolean {
    const preSpriteRenderer = <SpriteRenderer>preSpriteElement.component;
    const curSpriteRenderer = <SpriteRenderer>curSpriteElement.component;

    // Compare mask
    if (!this._checkBatchByMask(preSpriteRenderer, curSpriteRenderer)) {
      return false;
    }

    // Compare camera
    if (preSpriteElement.camera !== curSpriteElement.camera) {
      return false;
    }

    // Compare texture
    const { _textureProperty } = SpriteBatcher;
    const preTexture = preSpriteRenderer.shaderData.getTexture(_textureProperty);
    const curTexture = curSpriteRenderer.shaderData.getTexture(_textureProperty);
    if (preTexture !== curTexture) {
      return false;
    }

    // Compare material and shader
    const preMaterial = preSpriteElement.material;
    const curMaterial = curSpriteElement.material;
    if (
      preMaterial === curMaterial ||
      (preMaterial.shader.name === curMaterial.shader.name && curMaterial.shader.name === "Sprite")
    ) {
      return true;
    }

    return false;
  }

  _checkBatchByMask(sr1: SpriteRenderer, sr2: SpriteRenderer): boolean {
    debugger;
    const maskInteraction1 = sr1.maskInteraction;
    if (maskInteraction1 !== sr2.maskInteraction) {
      return false;
    }

    if (maskInteraction1 === SpriteMaskInteraction.None) {
      return true;
    }

    return sr1.maskLayer === sr2.maskLayer;
  }

  _updateVertices(element: SpriteElement, vertices: Float32Array, vertexIndex: number): number {
    const { positions, uv, color } = element;
    const verticesNum = positions.length;
    for (let i = 0; i < verticesNum; i++) {
      const curPos = positions[i];
      const curUV = uv[i];

      vertices[vertexIndex++] = curPos.x;
      vertices[vertexIndex++] = curPos.y;
      vertices[vertexIndex++] = curPos.z;
      vertices[vertexIndex++] = curUV.x;
      vertices[vertexIndex++] = curUV.y;
      vertices[vertexIndex++] = color.r;
      vertices[vertexIndex++] = color.g;
      vertices[vertexIndex++] = color.b;
      vertices[vertexIndex++] = color.a;
    }

    return vertexIndex;
  }

  _drawBatches(engine: Engine): void {
    const mesh = this._meshes[this._flushId];
    const subMeshes = mesh.subMeshes;
    const batchedQueue = this._batchedQueue;
    const maskManager = SpriteMaskManager.getInstance(engine);

    for (let i = 0, len = subMeshes.length; i < len; i++) {
      const subMesh = subMeshes[i];
      const spriteElement = <SpriteElement>batchedQueue[i];

      if (!subMesh || !spriteElement) {
        return;
      }

      const renderer = <SpriteRenderer>spriteElement.component;
      const camera = spriteElement.camera;
      maskManager.preRender(renderer, camera);

      const compileMacros = Shader._compileMacros;
      compileMacros.clear();

      const material = spriteElement.material;
      const program = material.shader._getShaderProgram(engine, compileMacros);
      if (!program.isValid) {
        return;
      }

      program.bind();
      program.groupingOtherUniformBlock();
      program.uploadAll(program.sceneUniformBlock, camera.scene.shaderData);
      program.uploadAll(program.cameraUniformBlock, camera.shaderData);
      program.uploadAll(program.rendererUniformBlock, renderer.shaderData);
      program.uploadAll(program.materialUniformBlock, material.shaderData);

      material.renderState._apply(engine);

      engine._hardwareRenderer.drawPrimitive(mesh, subMesh, program);

      maskManager.postRender(renderer, camera);
    }
  }
}
