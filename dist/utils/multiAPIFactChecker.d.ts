export interface FactCheckResult {
    source: 'openai' | 'claimbuster' | 'google';
    verdict: 'true' | 'false' | 'mixed' | 'unverified' | 'error';
    confidence: number;
    explanation: string;
    sources?: string[];
    rating?: string;
    claimReview?: any[];
}
export interface MultiAPIResult {
    overall_verdict: string;
    confidence_score: number;
    results: FactCheckResult[];
    consensus: boolean;
    summary: string;
}
export declare class MultiAPIFactChecker {
    private openaiApiKey;
    private claimbusterApiKey;
    private googleApiKey;
    constructor();
    /**
     * Check a claim using OpenAI GPT for fact verification
     */
    checkWithOpenAI(claim: string): Promise<FactCheckResult>;
    /**
     * Check a claim using ClaimBuster API
     */
    checkWithClaimBuster(claim: string): Promise<FactCheckResult>;
    /**
     * Check a claim using Google Fact Check Tools API
     */
    checkWithGoogle(claim: string): Promise<FactCheckResult>;
    /**
     * Run fact-checking across all available APIs and provide consensus
     */
    checkClaim(claim: string, useAllAPIs?: boolean): Promise<MultiAPIResult>;
    /**
     * Calculate consensus from multiple API results
     */
    private calculateConsensus;
    /**
     * Generate a human-readable summary of the fact-check results
     */
    private generateSummary;
    /**
     * Quick fact-check using only the fastest/most reliable API
     */
    quickCheck(claim: string): Promise<FactCheckResult>;
    /**
     * Check if APIs are properly configured
     */
    getAPIStatus(): {
        [key: string]: boolean;
    };
}
//# sourceMappingURL=multiAPIFactChecker.d.ts.map