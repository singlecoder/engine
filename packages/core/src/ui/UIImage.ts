import { Color, MathUtil } from "@galacean/engine-math";
import { Sprite, SpriteDrawMode, SpriteTileMode } from "../2d";
import { ISpriteAssembler } from "../2d/assembler/ISpriteAssembler";
import { SimpleSpriteAssembler } from "../2d/assembler/SimpleSpriteAssembler";
import { SlicedSpriteAssembler } from "../2d/assembler/SlicedSpriteAssembler";
import { TiledSpriteAssembler } from "../2d/assembler/TiledSpriteAssembler";
import { SpriteModifyFlags } from "../2d/enums/SpriteModifyFlags";
import { Entity } from "../Entity";
import { RenderQueueFlags } from "../RenderPipeline/BasicRenderPipeline";
import { BatchUtils } from "../RenderPipeline/BatchUtils";
import { RenderContext } from "../RenderPipeline/RenderContext";
import { SubRenderElement } from "../RenderPipeline/SubRenderElement";
import { assignmentClone, deepClone, ignoreClone } from "../clone/CloneManager";
import { UIRenderer, UIRendererUpdateFlags } from "./UIRenderer";
import { UITransform } from "./UITransform";
import { CanvasRenderMode } from "./enums/CanvasRenderMode";

export class UIImage extends UIRenderer {
  @deepClone
  private _color: Color = new Color(1, 1, 1, 1);
  @ignoreClone
  private _sprite: Sprite = null;
  @ignoreClone
  private _drawMode: SpriteDrawMode;
  @assignmentClone
  private _assembler: ISpriteAssembler;
  @assignmentClone
  private _tileMode: SpriteTileMode = SpriteTileMode.Continuous;
  @assignmentClone
  private _tiledAdaptiveThreshold: number = 0.5;

  /**
   * The draw mode of the sprite renderer.
   */
  get drawMode(): SpriteDrawMode {
    return this._drawMode;
  }

  set drawMode(value: SpriteDrawMode) {
    if (this._drawMode !== value) {
      this._drawMode = value;
      switch (value) {
        case SpriteDrawMode.Simple:
          this._assembler = SimpleSpriteAssembler;
          break;
        case SpriteDrawMode.Sliced:
          this._assembler = SlicedSpriteAssembler;
          break;
        case SpriteDrawMode.Tiled:
          this._assembler = TiledSpriteAssembler;
          break;
        default:
          break;
      }
      this._assembler.resetData(this);
      this._dirtyUpdateFlag |= ImageUpdateFlags.VertexData;
    }
  }

  /**
   * The tiling mode of the sprite renderer. (Only works in tiled mode.)
   */
  get tileMode(): SpriteTileMode {
    return this._tileMode;
  }

  set tileMode(value: SpriteTileMode) {
    if (this._tileMode !== value) {
      this._tileMode = value;
      if (this.drawMode === SpriteDrawMode.Tiled) {
        this._dirtyUpdateFlag |= ImageUpdateFlags.VertexData;
      }
    }
  }

  /**
   * Stretch Threshold in Tile Adaptive Mode, specified in normalized. (Only works in tiled adaptive mode.)
   */
  get tiledAdaptiveThreshold(): number {
    return this._tiledAdaptiveThreshold;
  }

  set tiledAdaptiveThreshold(value: number) {
    if (value !== this._tiledAdaptiveThreshold) {
      value = MathUtil.clamp(value, 0, 1);
      this._tiledAdaptiveThreshold = value;
      if (this.drawMode === SpriteDrawMode.Tiled) {
        this._dirtyUpdateFlag |= ImageUpdateFlags.VertexData;
      }
    }
  }

  /**
   * The Sprite to render.
   */
  get sprite(): Sprite {
    return this._sprite;
  }

  set sprite(value: Sprite | null) {
    const lastSprite = this._sprite;
    if (lastSprite !== value) {
      if (lastSprite) {
        this._addResourceReferCount(lastSprite, -1);
        lastSprite._updateFlagManager.removeListener(this._onSpriteChange);
      }
      this._dirtyUpdateFlag |= ImageUpdateFlags.All;
      if (value) {
        this._addResourceReferCount(value, 1);
        value._updateFlagManager.addListener(this._onSpriteChange);
        this.shaderData.setTexture(UIRenderer._textureProperty, value.texture);
      } else {
        this.shaderData.setTexture(UIRenderer._textureProperty, null);
      }
      this._sprite = value;
    }
  }

  /**
   * Rendering color for the Sprite graphic.
   */
  get color(): Color {
    return this._color;
  }

  set color(value: Color) {
    if (this._color !== value) {
      this._color.copyFrom(value);
      this._dirtyUpdateFlag |= ImageUpdateFlags.Color;
    }
  }

  /**
   * @internal
   */
  constructor(entity: Entity) {
    super(entity);

    this.drawMode = SpriteDrawMode.Simple;
    this._dirtyUpdateFlag |= ImageUpdateFlags.Color;
    this.setMaterial(this._engine._uiDefaultMaterial);
    this._onSpriteChange = this._onSpriteChange.bind(this);
  }

  /**
   * @internal
   */
  protected override _render(context: RenderContext): void {
    const { _sprite: sprite } = this;
    const transform = this._transform as UITransform;
    const { x: width, y: height } = transform.rect;
    if (!sprite?.texture || !width || !height) {
      return;
    }

    let material = this.getMaterial();
    if (!material) {
      return;
    }
    // @todo: This question needs to be raised rather than hidden.
    if (material.destroyed) {
      material = this._engine._uiDefaultMaterial;
    }

    const { _dirtyUpdateFlag: dirtyUpdateFlag } = this;
    // Update position
    if (dirtyUpdateFlag & ImageUpdateFlags.Position) {
      this._assembler.updatePositions(this, width, height, transform.pivot);
    }

    // Update uv
    if (dirtyUpdateFlag & ImageUpdateFlags.UV) {
      this._assembler.updateUVs(this);
    }

    // Update color
    if (dirtyUpdateFlag & ImageUpdateFlags.Color) {
      this._assembler.updateColor(this, this._alpha);
    } else if (dirtyUpdateFlag & UIRendererUpdateFlags.Alpha) {
      this._assembler.updateAlpha(this, this._alpha);
    }

    this._dirtyUpdateFlag = ImageUpdateFlags.None;
    // Init sub render element.
    const { engine } = context.camera;
    const canvas = this._canvas;
    const subRenderElement = engine._subRenderElementPool.get();
    const subChunk = this._subChunk;
    subRenderElement.set(this, material, subChunk.chunk.primitive, subChunk.subMesh, this.sprite.texture, subChunk);
    if (canvas.renderMode === CanvasRenderMode.ScreenSpaceOverlay) {
      subRenderElement.shaderPasses = material.shader.subShaders[0].passes;
      subRenderElement.renderQueueFlags = RenderQueueFlags.All;
    }
    canvas._renderElement.addSubRenderElement(subRenderElement);
  }

  /**
   * @internal
   */
  override _canBatch(elementA: SubRenderElement, elementB: SubRenderElement): boolean {
    return BatchUtils.canBatchSprite(elementA, elementB);
  }

  /**
   * @internal
   */
  override _batch(elementA: SubRenderElement, elementB?: SubRenderElement): void {
    BatchUtils.batchFor2D(elementA, elementB);
  }

  protected override _onDestroy(): void {
    const sprite = this._sprite;
    if (sprite) {
      this._addResourceReferCount(sprite, -1);
      sprite._updateFlagManager.removeListener(this._onSpriteChange);
    }

    super._onDestroy();

    this._entity = null;
    this._color = null;
    this._sprite = null;
    this._assembler = null;
  }

  @ignoreClone
  private _onSpriteChange(type: SpriteModifyFlags): void {
    switch (type) {
      case SpriteModifyFlags.texture:
        this.shaderData.setTexture(UIRenderer._textureProperty, this.sprite.texture);
        break;
      case SpriteModifyFlags.size:
        const { _drawMode: drawMode } = this;
        switch (drawMode) {
          case SpriteDrawMode.Sliced:
            this._dirtyUpdateFlag |= ImageUpdateFlags.Position;
            break;
          case SpriteDrawMode.Tiled:
            this._dirtyUpdateFlag |= ImageUpdateFlags.VertexData;
            break;
          default:
            break;
        }
        break;
      case SpriteModifyFlags.border:
        this._drawMode === SpriteDrawMode.Sliced && (this._dirtyUpdateFlag |= ImageUpdateFlags.VertexData);
        break;
      case SpriteModifyFlags.region:
      case SpriteModifyFlags.atlasRegionOffset:
        this._dirtyUpdateFlag |= ImageUpdateFlags.PositionAndUV;
        break;
      case SpriteModifyFlags.atlasRegion:
        this._dirtyUpdateFlag |= ImageUpdateFlags.UV;
        break;
      case SpriteModifyFlags.pivot:
        this._dirtyUpdateFlag |= ImageUpdateFlags.Position;
        break;
      case SpriteModifyFlags.destroy:
        this.sprite = null;
        break;
    }
  }
}

/**
 * @remarks Extends `RendererUpdateFlag`.
 */
enum ImageUpdateFlags {
  None,
  /** Position. */
  Position = 0x1,
  /** UV. */
  UV = 0x2,
  /** Position and UV. */
  PositionAndUV = 0x3,
  /** Color. */
  Color = 0x4,
  /** Vertex data. */
  VertexData = 0x7,

  /** All. */
  All = 0xf
}