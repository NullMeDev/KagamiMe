# Comprehensive Plan for Removing OpenAI API Usage

This document outlines the strategy for removing OpenAI API dependencies from the KagamiMe codebase and implementing alternative fact-checking approaches.

## 1. Overview of Current OpenAI Usage

OpenAI is currently used in:

- `src/utils/multiAPIFactChecker.ts` - Primary fact-checking using GPT models
- `src/utils/openaiClient.ts` - Client configuration and initialization
- `src/index.ts` - OpenAI client instantiation and API calls
- Various test files (`test-openai-only.js`, `test-multi-api-fact-checker.js`, etc.)
- Package.json dependency (`"openai": "^4.20.1"`)

## 2. Removal Strategy

### 2.1. Replace the OpenAI Fact-Checking Component

Create a new rules-based fact-checker implementation that relies on:

1. **Google Fact Check API**: Enhanced as the primary source
2. **ClaimBuster API**: Enhanced with additional contextual processing
3. **New Pattern-Matching System**: For basic claim verification without ML
4. **Local LLM Integration (Optional)**: Using an offline model like Llama

### 2.2. Implementation Steps

#### Step 1: Create a new Rules-Based Fact Checker

```typescript
// src/utils/factchecker/rulesBasedChecker.ts
export class RulesBasedFactChecker {
    async checkClaim(claim: string): Promise<FactCheckResult> {
        // Implement pattern matching logic for common claims
        // Use regex and keyword matching for basic analysis
        return {
            source: 'rules-engine',
            verdict: determineVerdict(claim),
            confidence: calculateConfidence(),
            explanation: generateExplanation(claim),
            sources: findRelevantSources(claim)
        };
    }
    
    // Helper methods for pattern matching, source lookup, etc.
}
```

#### Step 2: Enhance Google Fact Check API Usage

```typescript
// src/utils/factchecker/googleFactChecker.ts
export class GoogleFactChecker {
    private apiKey: string;
    
    constructor() {
        this.apiKey = process.env.GOOGLE_API_KEY || '';
    }
    
    async checkClaim(claim: string): Promise<FactCheckResult> {
        // Enhanced implementation with better error handling,
        // result processing, and confidence scoring
    }
    
    // Add additional methods for more advanced processing
}
```

#### Step 3: Update the MultiAPI Fact Checker

```typescript
// src/utils/factchecker/multiAPIFactChecker.ts
import { RulesBasedFactChecker } from './rulesBasedChecker';
import { GoogleFactChecker } from './googleFactChecker';
import { ClaimBusterChecker } from './claimBusterChecker';

export class MultiAPIFactChecker {
    private rulesChecker: RulesBasedFactChecker;
    private googleChecker: GoogleFactChecker;
    private claimBusterChecker: ClaimBusterChecker;
    
    constructor() {
        this.rulesChecker = new RulesBasedFactChecker();
        this.googleChecker = new GoogleFactChecker();
        this.claimBusterChecker = new ClaimBusterChecker();
    }
    
    async checkClaim(claim: string): Promise<MultiAPIResult> {
        // Run all available checkers in parallel
        // Aggregate and weigh results
        // Return consensus verdict
    }
}
```

### 2.3. File Deletion and Package Updates

Files to delete:
- `src/utils/openaiClient.ts`
- `test-openai-only.js`

Package.json update:
- Remove `"openai": "^4.20.1"` dependency

## 3. Alternative Fact-Checking Approaches

### 3.1. Rules-Based System

Implement a basic rules engine that:
- Uses regex pattern matching for common claims
- Maintains a database of pre-verified claims and responses
- Analyzes textual patterns associated with misinformation
- Performs keyword and phrase analysis

```typescript
// Example of simple rules engine
function analyzeClaimPatterns(claim: string): { score: number, matchedRules: string[] } {
    const rules = [
        { pattern: /earth is flat/i, verdict: 'false', confidence: 0.9 },
        { pattern: /vaccines cause autism/i, verdict: 'false', confidence: 0.9 },
        // More patterns for common misinformation
    ];
    
    const matchedRules = rules.filter(rule => rule.pattern.test(claim));
    const score = matchedRules.reduce((sum, rule) => sum + rule.confidence, 0) / 
                 (matchedRules.length || 1);
    
    return { score, matchedRules: matchedRules.map(r => r.pattern.toString()) };
}
```

### 3.2. Enhanced Google Fact Check API

Improve the Google Fact Check API implementation with:
- Better query formulation for more relevant results
- Multiple query variations to increase match probability
- Advanced result filtering and relevance scoring
- Structured caching to minimize API calls

### 3.3. ClaimBuster Integration Enhancement

Enhance the ClaimBuster API integration with:
- Improved claim matching algorithms
- Context-aware filtering of results
- Confidence scoring adjustments based on result quality
- Historical tracking of claim verification performance

### 3.4. Local LLM Integration (Optional)

For projects requiring ML capabilities without OpenAI:
- Integrate with Hugging Face Transformers for local inference
- Use models like Llama, Falcon, or Mistral
- Implement a simple prompt template system
- Ensure proper resource management for inference

## 4. Implementation Timeline

1. **Week 1**: Create rule-based checker and enhance Google/ClaimBuster integrations
2. **Week 2**: Update MultiAPIFactChecker to remove OpenAI dependency
3. **Week 3**: Update tests and documentation
4. **Week 4**: Performance testing and optimization

## 5. Technical Considerations

### 5.1. Performance Impact

Without OpenAI GPT, expect:
- Faster response times (no external ML API delay)
- Potentially lower accuracy for complex or novel claims
- Higher precision for well-known misinformation
- Lower operational costs

### 5.2. Infrastructure Requirements

- Local pattern matching requires minimal resources
- Local LLM integration would require additional CPU/RAM/GPU
- Database of pre-verified claims requires storage and maintenance

## 6. Monitoring and Improvement

- Implement logging of all fact-checking results
- Periodically review and update pattern matching rules
- Track accuracy metrics to identify areas for improvement
- Consider a feedback loop for users to report incorrect verdicts

