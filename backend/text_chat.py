#!/usr/bin/env python
"""
Simple single-request text chat script using HuggingFace Transformers.
Reads JSON from stdin: {"message": "..."}
Or accepts --message and --model args.

Note: This script loads the model on each invocation which is slow for large models.
For production, run a persistent Python server or use a GPU-backed service.
"""
import sys
import json
import argparse
import traceback
import platform
import os

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--message', type=str, help='User message')
    parser.add_argument('--model', type=str, default='LargeWorldModel/LWM-Text-Chat-1M', help='HF model name')
    parser.add_argument('--max_length', type=int, default=256)
    args = parser.parse_args()

    data = {}
    # try read stdin JSON if available
    try:
        raw = sys.stdin.read()
        if raw:
            data = json.loads(raw)
    except Exception:
        data = {}

    message = args.message or data.get('message')
    messages = data.get('messages') or None
    model_name = args.model

    if not message and not messages:
        print(json.dumps({'error': 'message or messages is required'}))
        sys.exit(1)

    # Optional quick test: try a very small conversational model first to verify
    # the transformers runtime is functioning (downloads a small model). Set
    # environment TEST_SMALL_MODEL=1 to enable this check. Default is OFF to
    # avoid extra downloads and failures on machines without Python deps.
    try_small = os.environ.get('TEST_SMALL_MODEL', '0') == '1'
    if try_small:
        try:
            sys.stderr.write('Running quick small-model health check (DialoGPT-small)...\n')
            from transformers import pipeline, Conversation
            small_pipe = pipeline('conversational', model='microsoft/DialoGPT-small')
            conv = Conversation('hello')
            _ = small_pipe(conv)
            sys.stderr.write('Small-model health check passed.\n')
        except Exception as e:
            tb = traceback.format_exc()
            sys.stderr.write('Small-model health check failed: ' + str(e) + "\n")
            # don't fail hard; return a JSON error so caller sees the detail
            print(json.dumps({'error': 'small-model-check-failed', 'detail': str(e), 'traceback': tb}))
            sys.exit(6)

    try:
        from transformers import AutoTokenizer, AutoModelForCausalLM
    except Exception as e:
        tb = traceback.format_exc()
        # include environment diagnostics
        env = {'python': platform.python_version()}
        try:
            import pkgutil
            env['transformers'] = __import__('transformers').__version__
        except Exception:
            env['transformers'] = None
        try:
            import torch
            env['torch'] = torch.__version__
            env['cuda_available'] = torch.cuda.is_available()
        except Exception:
            env['torch'] = None
            env['cuda_available'] = False
        print(json.dumps({'error': 'transformers import failed', 'detail': str(e), 'traceback': tb, 'env': env}))
        sys.exit(2)

    try:
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForCausalLM.from_pretrained(model_name)
    except Exception as e:
        tb = traceback.format_exc()
        # include some env info to help debugging
        env = {'python': platform.python_version()}
        try:
            import torch
            env['torch'] = torch.__version__
            env['cuda_available'] = torch.cuda.is_available()
        except Exception:
            env['torch'] = None
            env['cuda_available'] = False
        print(json.dumps({'error': 'model load failed', 'detail': str(e), 'traceback': tb, 'env': env}))
        sys.exit(3)

    try:
        # If messages (possibly multimodal) are provided and model looks like DeepSeek, use image-text pipeline
        if messages is not None and ('deepseek' in model_name.lower() or 'image-text' in model_name.lower() or 'ocr' in model_name.lower()):
            try:
                from transformers import pipeline
                pipe = pipeline("image-text-to-text", model=model_name, trust_remote_code=True)
                out = pipe(text=messages)
                # pipeline likely returns a list/dict with 'generated_text' or similar
                # Try to extract a text reply
                reply = None
                if isinstance(out, list) and len(out) > 0:
                    first = out[0]
                    # common key names
                    for k in ('generated_text', 'text', 'answer'):
                        if k in first:
                            reply = first[k]
                            break
                    if reply is None:
                        # fallback to stringifying
                        reply = json.dumps(first)
                else:
                    reply = str(out)
                print(json.dumps({'reply': reply}))
            except Exception as e:
                print(json.dumps({'error': 'deepseek pipeline failed', 'detail': str(e)}))
                sys.exit(5)
        # Prefer using the conversational pipeline if available (simpler API for chat models)
        try:
            from transformers import pipeline, Conversation
            use_pipeline = True
        except Exception:
            use_pipeline = False

        if use_pipeline:
            try:
                chat = pipeline("conversational", model=model_name)
                conv = Conversation(message)
                out = chat(conv)
                # out may be a Conversation or a list containing one
                conv_out = out[0] if isinstance(out, list) and len(out) > 0 else out
                # generated_responses holds the replies
                reply = None
                if hasattr(conv_out, 'generated_responses') and conv_out.generated_responses:
                    reply = conv_out.generated_responses[-1]
                elif hasattr(conv_out, 'text'):
                    reply = conv_out.text
                else:
                    reply = str(conv_out)
                print(json.dumps({'reply': reply}))
            except Exception as e:
                # If pipeline/conversation fails, fall back to tokenization + generate
                sys.stderr.write('conversational pipeline failed: ' + str(e) + "\n")
                # Prepare input using the recommended tokenizer API
                inputs = tokenizer(message, return_tensors='pt')
                outputs = model.generate(
                    **inputs,
                    max_length=args.max_length,
                    do_sample=True,
                    top_p=0.9,
                    temperature=0.8,
                    pad_token_id=tokenizer.eos_token_id if tokenizer.eos_token_id is not None else tokenizer.pad_token_id
                )
                reply = tokenizer.decode(outputs[0], skip_special_tokens=True)
                if reply.startswith(message):
                    reply = reply[len(message):].strip()
                print(json.dumps({'reply': reply}))
        else:
            # Prepare input using the recommended tokenizer API
            inputs = tokenizer(message, return_tensors='pt')
            outputs = model.generate(
                **inputs,
                max_length=args.max_length,
                do_sample=True,
                top_p=0.9,
                temperature=0.8,
                pad_token_id=tokenizer.eos_token_id if tokenizer.eos_token_id is not None else tokenizer.pad_token_id
            )
            reply = tokenizer.decode(outputs[0], skip_special_tokens=True)
            # If the model echoes the prompt, remove the prompt from the response
            if reply.startswith(message):
                reply = reply[len(message):].strip()
            print(json.dumps({'reply': reply}))
    except Exception as e:
        print(json.dumps({'error': 'generation failed', 'detail': str(e)}))
        sys.exit(4)

if __name__ == '__main__':
    main()
