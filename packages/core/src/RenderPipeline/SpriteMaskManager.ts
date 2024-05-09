import { SpriteMask, TextRenderer } from "../2d";
import { SpriteMaskInteraction } from "../2d/enums/SpriteMaskInteraction";
import { SpriteRenderer } from "../2d/sprite/SpriteRenderer";
import { Camera } from "../Camera";
import { DisorderedArray } from "../DisorderedArray";
import { Engine } from "../Engine";
import { CompareFunction, StencilOperation, StencilState } from "../shader";
import { SpriteMaskBatcher } from "./batcher/SpriteMaskBatcher";

/**
 * @internal
 */
export class SpriteMaskManager {
  private static _tempStencilState: StencilState = new StencilState();

  /** @internal */
  _batcher: SpriteMaskBatcher;
  /** @internal */
  _allSpriteMasks: DisorderedArray<SpriteMask> = new DisorderedArray();

  private _preMaskLayer: number = 0;

  constructor(engine: Engine) {
    this._batcher = new SpriteMaskBatcher(engine, 128);
  }

  addMask(mask: SpriteMask): void {
    this._allSpriteMasks.add(mask);
  }

  clear(): void {
    this._allSpriteMasks.length = 0;
    this._preMaskLayer = 0;
    this._batcher.clear();
  }

  preRender(camera: Camera, renderer: SpriteRenderer | TextRenderer): void {
    const { maskInteraction } = renderer;
    if (maskInteraction === SpriteMaskInteraction.None) {
      return;
    }

    const stencilState = renderer.getMaterial().renderState.stencilState;
    this._copyStencilState(stencilState, SpriteMaskManager._tempStencilState);
    stencilState.enabled = true;
    stencilState.writeMask = 0x00;
    stencilState.referenceValue = 1;
    stencilState.compareFunctionFront = stencilState.compareFunctionBack =
      maskInteraction === SpriteMaskInteraction.VisibleInsideMask ? CompareFunction.LessEqual : CompareFunction.Greater;

    this._batcher.clear();
    this._processMasksDiff(camera, renderer);
    this._batcher.uploadAndDraw(camera);
  }

  postRender(renderer: SpriteRenderer | TextRenderer): void {
    if (renderer.maskInteraction === SpriteMaskInteraction.None) {
      return;
    }

    this._preMaskLayer = renderer.maskLayer;
    this._copyStencilState(SpriteMaskManager._tempStencilState, renderer.getMaterial().renderState.stencilState);
  }

  destroy(): void {
    this._allSpriteMasks.length = 0;
    this._batcher.destroy();
    this._batcher = null;
  }

  private _processMasksDiff(camera: Camera, renderer: SpriteRenderer | TextRenderer): void {
    const preMaskLayer = this._preMaskLayer;
    const curMaskLayer = renderer.maskLayer;
    if (preMaskLayer !== curMaskLayer) {
      const { _allSpriteMasks: masks, _batcher } = this;
      const commonLayer = preMaskLayer & curMaskLayer;
      const addLayer = curMaskLayer & ~preMaskLayer;
      const reduceLayer = preMaskLayer & ~curMaskLayer;

      const allMaskElements = masks._elements;
      for (let i = 0, n = masks.length; i < n; i++) {
        const mask = allMaskElements[i];
        const influenceLayers = mask.influenceLayers;

        if (influenceLayers & commonLayer) {
          continue;
        }

        if (influenceLayers & addLayer) {
          const maskRenderElement = mask._maskElement;
          _batcher.drawElement(maskRenderElement, camera, StencilOperation.IncrementSaturate);
          continue;
        }

        if (influenceLayers & reduceLayer) {
          const maskRenderElement = mask._maskElement;
          _batcher.drawElement(maskRenderElement, camera, StencilOperation.DecrementSaturate);
        }
      }
    }
  }

  private _copyStencilState(scrStencilState: StencilState, dstStencilState: StencilState): void {
    dstStencilState.enabled = scrStencilState.enabled;
    dstStencilState.writeMask = scrStencilState.writeMask;
    dstStencilState.referenceValue = scrStencilState.referenceValue;
    dstStencilState.compareFunctionFront = scrStencilState.compareFunctionFront;
    dstStencilState.compareFunctionBack = scrStencilState.compareFunctionBack;
  }
}
