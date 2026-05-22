import * as pixi from 'pixi.js';
import { gsap } from "gsap";

async function loadShader(path: string) {
    const response = await fetch(path);
    return response.text();
}

export async function revealLoot(sprite: pixi.Sprite): Promise<void> {
    sprite.visible = false;
    const noiseTexture = await pixi.Assets.load("noise/perlin23.png");
    const vertex = await loadShader("/shaders/dissolve.vert.glsl");
    const fragment = await loadShader("/shaders/dissolve.frag.glsl");

    const dissolve = new pixi.Filter({
        glProgram: new pixi.GlProgram({
            vertex,
            fragment,
        }),
        resources: {
            dissolveUniforms: {
                progress: { value: 1, type: "f32" },
                burnColor: { value: [0.451, 0.584, 0.322], type: "vec3<f32>" },
            },
            uNoise: noiseTexture.source,
        },
    });

    sprite.filters = [dissolve];
    sprite.visible = true;

    await new Promise((resolve) => {
        gsap.to(dissolve.resources.dissolveUniforms.uniforms, {
            progress: 0,
            duration: 2.5,
            ease: "power4.in",
            onComplete: resolve
        });
    });
}