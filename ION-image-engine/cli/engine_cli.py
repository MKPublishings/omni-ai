import argparse
from ion_image_engine.engine_bootstrap import build_engine, load_config

def main():
    parser = argparse.ArgumentParser("ION-image-engine")
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--profile", default="photoreal")
    parser.add_argument("--seed", type=int, default=0)
    args = parser.parse_args()
    config = load_config()
    engine = build_engine(config)
    output = engine.pipeline.generate(args.prompt, args.profile, args.seed)
    if hasattr(output, "save"):
        output.save("output.png")
        print("Saved to output.png")
    else:
        print("Output:", output)
