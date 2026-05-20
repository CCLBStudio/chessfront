precision highp float;

in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform sampler2D uNoise;
uniform float progress;
uniform vec3 burnColor;

out vec4 finalColor;

void main(void)
{
    vec4 color = texture(uTexture, vTextureCoord);
    float noise = texture(uNoise, vTextureCoord).r;
    float alpha = step(progress, noise);
    float edge = smoothstep(progress + (.5 * progress), progress, noise);
    vec3 edgeGlow = (burnColor * edge);

    finalColor = vec4((color.rgb + edgeGlow) * (alpha * color.a), color.a * alpha);
}
