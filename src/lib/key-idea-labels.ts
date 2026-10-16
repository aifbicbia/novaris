// Native select options cannot typeset TeX. These exact presentation labels
// preserve the stored ideas, filter values and public URLs without guessing
// how to flatten arbitrary mathematics. Unmapped ideas are shown unchanged.
export const keyIdeaLabels: Readonly<Record<string, string>> = {
  "Require floor changes immediately before and after $n$":
    "Require floor changes immediately before and after n",
  "Angles around a point sum to $360^\\circ$.":
    "Angles around a point sum to 360°.",
  "Compare $c^2=u^2+v^2$ with $c^2=2uv$ to obtain $(u-v)^2=0$":
    "Compare c² = u² + v² with c² = 2uv to obtain (u − v)² = 0",
  "Force is $-dU/dx$; kinetic energy is total energy minus potential energy.":
    "Force is −dU/dx; kinetic energy is total energy minus potential energy.",
  "Rotating pulley inertia enters as an effective mass $I/R^2$.":
    "Rotating pulley inertia enters as an effective mass I/R².",
  "Use $a=v\\,dv/dx$ for a velocity-position graph.":
    "Use a = v·dv/dx for a velocity–position graph.",
  "Integrate $dp/dz=\\rho g$ through each layer.":
    "Integrate dp/dz = ρg through each layer.",
  "Maximize across all budget levels because the allowed count is at most $K$.":
    "Maximize across all budget levels because the allowed count is at most K.",
  "Exactly $K$ is an equality objective, and the source’s positive $K$ makes the outside region irrelevant.":
    "Exactly K is an equality objective, and the source’s positive K makes the outside region irrelevant.",
  "Apply $\\mathbf F=q\\mathbf v\\times\\mathbf B$ with the charge sign.":
    "Apply F = q(v × B) with the charge sign; F, v and B are vectors.",
  "Preserve multiplicity when $A=B$ or when a single value equals another sum.":
    "Preserve multiplicity when A = B or when a single value equals another sum.",
  "The horizon includes the dinner on day $T$.":
    "The horizon includes the dinner on day T.",
};

export function keyIdeaLabel(value: string): string {
  return Object.prototype.hasOwnProperty.call(keyIdeaLabels, value)
    ? keyIdeaLabels[value]
    : value;
}
