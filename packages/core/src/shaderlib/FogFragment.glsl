#if GALACEAN_FOG_MODE != 0
    float fogIntensity = ComputeFogIntensity(length(v_positionVS));
    gl_FragColor.rgb = mix(galacean_FogColor.rgb, gl_FragColor.rgb, fogIntensity);
#endif
