// echarts-gl ships no types. Its per-chart entries only register themselves with echarts
// (`use(install)`) when imported, so they are declared as side-effect modules; the options they
// read are typed in `bar3DOptions.ts`.
declare module 'echarts-gl/lib/chart/bar3D.js';
declare module 'echarts-gl/lib/component/grid3D.js';
