import sys, struct, json
sys.stdout.reconfigure(encoding="utf-8")

with open(r"D:\AI\画图模型\Flux.1-dev.safetensors", "rb") as f:
    header_len_bytes = f.read(8)
    header_len = struct.unpack("<Q", header_len_bytes)[0]
    header_json = f.read(header_len).decode("utf-8")
    header = json.loads(header_json)

# Check for __metadata__ and first few tensor keys
if "__metadata__" in header:
    print("Metadata:", json.dumps(header["__metadata__"], indent=2, ensure_ascii=False)[:500])

# Show first 10 tensor keys to understand model type
tensor_keys = [k for k in header if k != "__metadata__"]
print(f"\nTotal tensor keys: {len(tensor_keys)}")
print("First 10 keys:")
for k in tensor_keys[:10]:
    print(f"  {k}: shape={header[k]['shape']}")

# Check for CLIP, VAE, UNET key patterns
has_clip = any("clip" in k.lower() for k in tensor_keys)
has_vae = any("vae" in k.lower() for k in tensor_keys)
has_unet = any("model.diffusion" in k or "unet" in k.lower() for k in tensor_keys)
has_transformer = any("transformer" in k.lower() for k in tensor_keys)
has_t5 = any("t5" in k.lower() for k in tensor_keys)
print(f"\nContains: CLIP={has_clip}, VAE={has_vae}, UNET={has_unet}, Transformer={has_transformer}, T5={has_t5}")
