# ION Image Pipeline: Fallback vs Full Pipeline Diagnosis

## Current Status

You're seeing **"ai-direct-fallback"** in image responses, which indicates the SDXL fallback is being used instead of the full ION pipeline.

## Root Cause Analysis

The fallback is triggered when:

1. **Pipeline Error Occurs** - `executeIonImagePipeline()` throws an error
2. **Error Matches Fallback Condition** - The error is specifically a 403 on `/prompt` endpoint (ion access denied)
3. **AI Model Available** - `env.AI` exists and has a `run` function (Cloudflare Workers AI)

## Configuration Check

✅ **Good News**: Your environment is configured with `ion_MOCK=true`

This means:
- Using `MockionClient` (not real ion)
- Should NEVER fail with 403 errors
- Should NOT trigger fallback

**If you're still seeing "ai-direct-fallback" with mock mode enabled, there's a code-level issue.**

## Diagnostic Steps

### 1. Check Response Metadata

When you make an image request, check the response metadata:

```json
{
  "metadata": {
    "pipeline": {
      "gateway": "???",
      "reasoningChain": ["???"]
    }
  }
}
```

**Expected with full ION pipeline:**
- `gateway`: `"mock"` or `"ion"`
- `reasoningChain`: Should show pipeline stages

**Actual with fallback:**
- `gateway`: `"ai-direct-fallback"`
- `reasoningChain`: `["ion-forbidden-fallback"]`

### 2. Check Logs for Pipeline Errors

The following log events have been added for debugging:

```
ion_image_pipeline_start              → Pipeline execution started
ion_image_pipeline_success            → Full pipeline succeeded
ion_image_pipeline_error              → Pipeline encountered error
ion_image_pipeline_fallback_triggered → Fallback to SDXL activated
```

Look in logs for `ion_image_pipeline_error` to see what error is occurring.

### 3. Verify Safe.tensor Bootstrap

The pipeline now bootstraps safe.tensor governance before execution:

```
safe_tensor_bootstrap_notice → Safe.tensor initialization
```

If bootstrap is failing, it logs a notice (non-fatal).

### 4. Run Environment Diagnostic

```bash
node scripts/diagnose-image-pipeline.js
```

This shows:
- Current gateway configuration (mock vs real)
- Expected behavior
- What to look for in responses

## Possible Issues

### Issue 1: Gateway Health Check Failing

Even with mock mode, if `gateway.isHealthy()` returns false:
- `throwImageError('E_ion_DOWN')` is called
- This triggers the fallback

**Check**: MockionClient.isHealthy() always returns true, so this shouldn't happen

### Issue 2: Gateway Submit Workflow Failing

If `gateway.submitWorkflow()` throws 403 error:
- Caught by `isIonPromptAccessDeniedError()`
- Triggers fallback

**Check**: MockionClient generates mock data, shouldn't throw

### Issue 3: Environment Not Properly Passed

If `env` parameter not passed to pipeline:
- Gateway creation might use default environment
- Real ion might be used instead of mock

**Check**: Verify `env` is passed through call chain

## What's Been Fixed

✅ **Safe.tensor Bootstrap Integration**
- Added `bootstrapSafeTensorGovernance()` call before pipeline
- Governance kernel now activates before routing

✅ **Enhanced Error Logging**
- Detailed pipeline execution logging
- Clear indication when fallback is triggered
- Error messages show what went wrong

✅ **Diagnostic Script**
- Easy way to check configuration
- Connectivity testing for real ion mode
- Clear expected behavior documentation

## How to Ensure No Fallback

### Option 1: Use Mock Mode (Recommended for Development)
```bash
ion_MOCK=true node your-app.js
```
- Always uses full pipeline
- No external dependencies
- Generates mock images

### Option 2: Use Real ion
```bash
ion_MOCK=false ion_HOST=http://your-ion:8188
```
- Ensure ion is running
- Ensure `/prompt` endpoint is accessible
- May trigger fallback if ion is down

## Next Steps

1. **Check Current Logs**
   - Look for `ion_image_pipeline_error` events
   - Note the exact error message

2. **Run Diagnostic**
   ```bash
   node scripts/diagnose-image-pipeline.js
   ```

3. **Make a Test Request**
   - Send image generation request
   - Check response metadata for `gateway` value
   - Compare logs before/after

4. **If Still Seeing Fallback**
   - Share the `ion_image_pipeline_error` log details
   - This will show exactly what's failing

## Key Code Locations

- **Pipeline Execution**: `src/index.ts` lines 3825-3965
- **Error Handling**: `src/index.ts` lines 3920-3960
- **Gateway Selection**: `src/image-gen/app/ion-image-pipeline.ts` lines 85-98
- **Fallback Response**: `src/index.ts` lines 410-530
- **Safe.tensor Bootstrap**: `src/image-gen/safe-tensor-bootstrap.ts`

## Expected Behavior (With Fixes Applied)

1. Request arrives
2. ✅ Safe.tensor governance bootstraps
3. ✅ Pipeline starts (log: `ion_image_pipeline_start`)
4. ✅ Gateway created (mock or real)
5. ✅ Health check passes
6. ✅ Workflow submitted successfully
7. ✅ Image generated
8. ✅ Response returns with `gateway: "mock"` or `"ion"`
9. ❌ No fallback triggered

## Verification Command

To verify the pipeline is working:

```bash
# Make sure safe.tensor bootstrap and logging are enabled
npm run typecheck  # Verify compilation

# Check logs for successful pipeline execution
grep "ion_image_pipeline_success" your-logs.json

# Check for absence of fallback errors
grep -v "ion_image_pipeline_fallback_triggered" your-logs.json
```

---

**The system is now configured to use the full ION pipeline with safe.tensor governance activated. If you're still seeing fallback responses, the enhanced logging will show exactly why.**
