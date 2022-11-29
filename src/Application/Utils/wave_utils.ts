export function vertexShader(){
    return `
      #define PI 3.14159265359
  
      uniform float u_time;
      uniform float u_pointsize;
      uniform float u_noise_amp_1;
      uniform float u_noise_freq_1;
      uniform float u_spd_modifier_1;
      uniform float u_noise_amp_2;
      uniform float u_noise_freq_2;
      uniform float u_spd_modifier_2;
  
      // 2D Random
      float random (in vec2 st) {
          return fract(sin(dot(st.xy,
                              vec2(12.9898,78.233)))
                      * 43758.5453123);
      }
  
      // 2D Noise based on Morgan McGuire @morgan3d
      // https://www.shadertoy.com/view/4dS3Wd
      float noise (in vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
  
          // Four corners in 2D of a tile
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));
  
          // Smooth Interpolation
  
          // Cubic Hermine Curve.  Same as SmoothStep()
          vec2 u = f*f*(3.0-2.0*f);
          // u = smoothstep(0.,1.,f);
  
          // Mix 4 coorners percentages
          return mix(a, b, u.x) +
                  (c - a)* u.y * (1.0 - u.x) +
                  (d - b) * u.x * u.y;
      }
  
      mat2 rotate2d(float angle){
          return mat2(cos(angle),-sin(angle),
                    sin(angle),cos(angle));
      }
  
      void main() {
        gl_PointSize = u_pointsize;
  
        vec3 pos = position;
        // pos.xy is the original 2D dimension of the plane coordinates
        pos.z += noise(pos.xy * u_noise_freq_1 + u_time * u_spd_modifier_1) * u_noise_amp_1;
        // add noise layering
        // minus u_time makes the second layer of wave goes the other direction
        pos.z += noise(rotate2d(PI / 4.) * pos.yx * u_noise_freq_2 - u_time * u_spd_modifier_2 * 0.6) * u_noise_amp_2;
  
        vec4 mvm = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvm;
      }
    `;
  }

export function fragmentShader_img(){
    return `
      #ifdef GL_ES
      precision mediump float;
      #endif
      uniform sampler2D uTexture;
      uniform float uAlpha;
      uniform vec2 u_resolution;
      
      void main(){
        vec3 color = texture2D(uTexture, gl_FragCoord.xy/u_resolution.xy).rgb;
        gl_FragColor = vec4(color, uAlpha);            
      }
    `
}


export function fragmentShader(){
    return `
    #ifdef GL_ES
    precision mediump float;
    #endif
  
    #define PI 3.14159265359
    #define TWO_PI 6.28318530718
    
    uniform vec2 u_resolution;
  
    void main() {
      vec2 st = gl_FragCoord.xy/u_resolution.xy;
  
      gl_FragColor = vec4(vec3(0.0, st),1.0);
    }
    `;
  }

