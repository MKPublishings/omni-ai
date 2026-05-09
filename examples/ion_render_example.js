/**
 * Example: Basic Ion Render with Diagnostics
 * Demonstrates how to use IonRenderController with stability checks
 */

const IonRenderController = require('./ION-image-engine/renderer/ion_render_controller');
const fs = require('fs');
const path = require('path');

// Initialize controller with diagnostics enabled
const controller = new IonRenderController({
  enableDiagnostics: true,
  enableAutoCorrect: true,
  basePromptsPath: path.join(__dirname, 'ION-image-engine/prompts/base_prompts.json'),
  negativeTagsPath: path.join(__dirname, 'ION-image-engine/prompts/negative_tags.json'),
  compositionPath: path.join(__dirname, 'ION-image-engine/prompts/composition_templates.json'),
  logsPath: path.join(__dirname, 'logs/generation')
});

async function exampleBasicRender() {
  console.log('=== Ion Render Example ===\n');

  // 1. Create a render request
  const renderRequest = {
    id: 'example-001',
    promptTemplate: 'anime_woman_portrait',  // Use built-in template
    composition: 'portrait_9_16',             // 9:16 portrait format
    model: 'ion-anime-stable',
    steps: 25,
    guidance: 7.5,
    seed: 12345
  };

  console.log('1. Render Request:');
  console.log(JSON.stringify(renderRequest, null, 2));
  console.log();

  // 2. Orchestrate render (build complete config)
  console.log('2. Orchestrating render...');
  const orchestration = controller.orchestrateRender(renderRequest);
  
  console.log('   ✓ Prompt built:', orchestration.promptConfig.finalPrompt.substring(0, 100) + '...');
  console.log('   ✓ Stability config applied');
  console.log('   ✓ Diagnostics plan created');
  console.log();

  // 3. Show final render config (what gets passed to model)
  console.log('3. Final Render Configuration:');
  console.log('   Model:', orchestration.fullConfig.model);
  console.log('   Sampling:', orchestration.fullConfig.samplingMethod);
  console.log('   Steps:', orchestration.fullConfig.steps);
  console.log('   Guidance:', orchestration.fullConfig.guidance);
  console.log('   Tag count:', orchestration.fullConfig.tags.length);
  console.log('   Negative tags:', orchestration.fullConfig.negativePrompt.split(',').length);
  console.log();

  // 4. Simulate render output (in real use, this comes from model)
  console.log('4. Simulating render output...');
  const mockRenderOutput = {
    imageId: 'img-12345',
    dimensions: { width: 720, height: 1280 },
    proportions: {
      headHeight: 160,
      bodyHeight: 1200,
      torsoHeight: 336,
      armLength: 516,
      legLength: 516,
      faceHeight: 144,
      shoulderWidth: 300
    },
    boundingBox: {
      faceTop: 0.12,
      faceBottom: 0.24,
      eyeDistance: 0.08
    },
    featureMap: [
      { type: 'eyes', count: 2 },
      { type: 'nose', count: 1 },
      { type: 'mouth', count: 1 }
    ],
    lighting: {
      averageBrightness: 0.65,
      harshShadowRatio: 0.15,
      inconsistency: 0.2
    },
    depthMap: {
      depthSeparation: 0.35,
      warping: 0.05
    }
  };

  console.log('   ✓ Mock output created');
  console.log();

  // 5. Run diagnostics on output
  console.log('5. Running Diagnostics:');
  const diagnosticsResult = controller.processRenderOutput(mockRenderOutput);

  console.log('   Overall Status:', diagnosticsResult.diagnostics.overall);
  
  if (diagnosticsResult.diagnostics.detections.length > 0) {
    console.log('   Detections:');
    diagnosticsResult.diagnostics.detections.forEach(detection => {
      console.log(`     - ${detection.type} (${detection.severity})`);
    });
  } else {
    console.log('   ✓ No issues detected!');
  }
  console.log();

  // 6. Show recommendations if any issues
  if (diagnosticsResult.diagnostics.recommendations.length > 0) {
    console.log('6. Recommendations:');
    diagnosticsResult.diagnostics.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec.action} (Priority: ${rec.priority})`);
    });
    console.log();
  }

  // 7. Controller status
  console.log('7. System Status:');
  const status = controller.getStatus();
  console.log(`   Generations Processed: ${status.generationsProcessed}`);
  console.log(`   Diagnostics Enabled: ${status.diagnosticsEnabled}`);
  console.log(`   Diagnostics Pass Rate: ${(status.diagnosticsSummary.passRate * 100).toFixed(1)}%`);
  console.log();

  // 8. Save example output
  const outputPath = path.join(__dirname, 'logs/generation/example_output.json');
  const output = {
    requestId: orchestration.requestId,
    timestamp: orchestration.timestamp,
    renderConfig: orchestration.fullConfig,
    diagnostics: diagnosticsResult.diagnostics,
    status: 'success'
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`✓ Example output saved to: logs/generation/example_output.json`);
  console.log();
  console.log('=== Example Complete ===');
}

// Advanced example: Testing different configurations
async function exampleConfigurationTesting() {
  console.log('\n=== Testing Different Configurations ===\n');

  const configurations = [
    {
      name: 'Maximum Stability',
      settings: {
        promptTemplate: 'anime_woman_portrait',
        composition: 'portrait_9_16',
        guidance: 6.5,
        steps: 30
      }
    },
    {
      name: 'Balanced Quality',
      settings: {
        promptTemplate: 'anime_woman_portrait',
        composition: 'portrait_9_16',
        guidance: 7.5,
        steps: 25
      }
    },
    {
      name: 'Creative Mode',
      settings: {
        promptTemplate: 'anime_woman_portrait',
        composition: 'three_quarter_view',
        guidance: 8.5,
        steps: 35
      }
    }
  ];

  for (const config of configurations) {
    console.log(`Testing: ${config.name}`);
    
    const renderRequest = {
      id: `test-${config.name.toLowerCase().replace(/\s+/g, '-')}`,
      ...config.settings
    };

    const orchestration = controller.orchestrateRender(renderRequest);
    console.log(`  ✓ Render configured`);
    console.log(`  ✓ Tags: ${orchestration.fullConfig.tags.length}`);
    console.log(`  ✓ Guidance: ${orchestration.fullConfig.guidance}`);
    console.log();
  }

  console.log('=== Configuration Testing Complete ===');
}

// Run example
if (require.main === module) {
  (async () => {
    try {
      await exampleBasicRender();
      await exampleConfigurationTesting();
    } catch (error) {
      console.error('Error running example:', error);
      process.exit(1);
    }
  })();
}

module.exports = { exampleBasicRender, exampleConfigurationTesting };
