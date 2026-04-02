# Cosmic Dynamics Template

## Virial Proxy

Use the runtime virial proxy for coarse equilibrium checks:

2T/|W|

Where:

- T is kinetic energy proxy from circular velocity at solar radius
- W is potential energy proxy from enclosed total mass

Expected stable operating band for coarse checks:

0.5 <= 2T/|W| <= 2.0

## Rotation State Sample

For radius R:

- v_circ(R) from potential gradient
- omega(R) = v_circ / R
- kappa from epicyclic derivative relation

This template supports quick validation and diagnostics interpretation for cosmic runs.
