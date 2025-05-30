"use strict";
// Multi-API Fact Checker for KagamiMe
// Integrates ClaimBuster and Google Fact Check APIs
// Made with 💜 by NullMeDev
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiAPIFactChecker = void 0;
const axios_1 = __importDefault(require("axios"));
class MultiAPIFactChecker {
    constructor() {
        this.claimbusterApiKey = process.env.CLAIMBUSTER_API_KEY || '';
        this.googleApiKey = process.env.GOOGLE_API_KEY || '';
    }
    // OpenAI integration has been removed
    /**
     * Check a claim using ClaimBuster API
     */
    async checkWithClaimBuster(claim) {
        try {
            if (!this.claimbusterApiKey) {
                throw new Error('ClaimBuster API key not configured');
            }
            // First, get claim score
            const scoreResponse = await axios_1.default.get('https://idir.uta.edu/claimbuster/api/v2/score/text', {
                params: {
                    input_text: claim,
                    api_key: this.claimbusterApiKey
                },
                timeout: 10000
            });
            const claimScore = scoreResponse.data?.results?.[0]?.score || 0;
            // If score is high enough, search for fact-checks
            let factCheckResults = null;
            if (claimScore > 0.5) {
                try {
                    const searchResponse = await axios_1.default.get('https://idir.uta.edu/claimbuster/api/v2/query/fact_matcher', {
                        params: {
                            input_claim: claim,
                            api_key: this.claimbusterApiKey
                        },
                        timeout: 10000
                    });
                    factCheckResults = searchResponse.data?.claims || [];
                }
                catch (searchError) {
                    console.warn('ClaimBuster search failed:', searchError);
                }
            }
            let verdict = 'unverified';
            let confidence = claimScore;
            let explanation = `ClaimBuster check-worthiness score: ${(claimScore * 100).toFixed(1)}%`;
            let sources = [];
            if (factCheckResults && factCheckResults.length > 0) {
                const topResult = factCheckResults[0];
                const rating = topResult.ruling?.toLowerCase() || '';
                if (rating.includes('true') || rating.includes('correct')) {
                    verdict = 'true';
                }
                else if (rating.includes('false') || rating.includes('incorrect')) {
                    verdict = 'false';
                }
                else if (rating.includes('mixed') || rating.includes('partly')) {
                    verdict = 'mixed';
                }
                explanation += `. Similar claim found: "${topResult.text}" - Rating: ${topResult.ruling}`;
                sources = [topResult.url || 'ClaimBuster database'];
            }
            return {
                source: 'claimbuster',
                verdict,
                confidence,
                explanation,
                sources,
                rating: factCheckResults?.[0]?.ruling
            };
        }
        catch (error) {
            console.error('ClaimBuster fact-check error:', error);
            return {
                source: 'claimbuster',
                verdict: 'error',
                confidence: 0,
                explanation: `ClaimBuster check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                sources: []
            };
        }
    }
    /**
     * Check a claim using Google Fact Check Tools API
     */
    async checkWithGoogle(claim) {
        try {
            if (!this.googleApiKey) {
                throw new Error('Google Fact Check API key not configured');
            }
            const response = await axios_1.default.get('https://factchecktools.googleapis.com/v1alpha1/claims:search', {
                params: {
                    query: claim,
                    key: this.googleApiKey,
                    languageCode: 'en'
                },
                timeout: 10000
            });
            const claims = response.data?.claims || [];
            if (claims.length === 0) {
                return {
                    source: 'google',
                    verdict: 'unverified',
                    confidence: 0,
                    explanation: 'No fact-checks found in Google database',
                    sources: [],
                    claimReview: []
                };
            }
            // Analyze the first relevant claim review
            const claim_review = claims[0]?.claimReview?.[0];
            if (!claim_review) {
                return {
                    source: 'google',
                    verdict: 'unverified',
                    confidence: 0.3,
                    explanation: 'Claim found but no review available',
                    sources: [],
                    claimReview: claims
                };
            }
            const rating = claim_review.textualRating?.toLowerCase() || '';
            let verdict = 'unverified';
            let confidence = 0.7; // Default confidence for Google results
            // Map Google ratings to our verdicts
            if (rating.includes('true') || rating.includes('correct') || rating.includes('accurate')) {
                verdict = 'true';
                confidence = 0.9;
            }
            else if (rating.includes('false') || rating.includes('incorrect') || rating.includes('inaccurate')) {
                verdict = 'false';
                confidence = 0.9;
            }
            else if (rating.includes('mixed') || rating.includes('partly') || rating.includes('partially')) {
                verdict = 'mixed';
                confidence = 0.8;
            }
            else if (rating.includes('unverified') || rating.includes('unknown')) {
                verdict = 'unverified';
                confidence = 0.5;
            }
            return {
                source: 'google',
                verdict,
                confidence,
                explanation: `Google Fact Check: "${claim_review.textualRating}" - ${claim_review.publisher?.name || 'Unknown publisher'}`,
                sources: [claim_review.url || claim_review.publisher?.site || 'Google Fact Check'],
                claimReview: claims
            };
        }
        catch (error) {
            console.error('Google fact-check error:', error);
            return {
                source: 'google',
                verdict: 'error',
                confidence: 0,
                explanation: `Google check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                sources: [],
                claimReview: []
            };
        }
    }
    /**
     * Run fact-checking across all available APIs and provide consensus
     */
    async checkClaim(claim, useAllAPIs = true) {
        const results = [];
        // Run checks in parallel for speed
        const promises = [];
        if (this.claimbusterApiKey && useAllAPIs) {
            promises.push(this.checkWithClaimBuster(claim));
        }
        if (this.googleApiKey && useAllAPIs) {
            promises.push(this.checkWithGoogle(claim));
        }
        // Wait for all checks to complete
        const checkResults = await Promise.allSettled(promises);
        checkResults.forEach((result) => {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            }
        });
        return this.calculateConsensus(results, claim);
    }
    /**
     * Calculate consensus from multiple API results
     */
    calculateConsensus(results, originalClaim) {
        if (results.length === 0) {
            return {
                overall_verdict: 'error',
                confidence_score: 0,
                results: [],
                consensus: false,
                summary: 'No fact-checking APIs were available or all failed.'
            };
        }
        // Filter out error results for consensus calculation
        const validResults = results.filter(r => r.verdict !== 'error');
        if (validResults.length === 0) {
            return {
                overall_verdict: 'error',
                confidence_score: 0,
                results,
                consensus: false,
                summary: 'All fact-checking APIs encountered errors.'
            };
        }
        // Calculate weighted consensus
        const verdictCounts = new Map();
        let totalWeightedConfidence = 0;
        validResults.forEach(result => {
            const current = verdictCounts.get(result.verdict) || { count: 0, totalConfidence: 0 };
            verdictCounts.set(result.verdict, {
                count: current.count + 1,
                totalConfidence: current.totalConfidence + result.confidence
            });
            totalWeightedConfidence += result.confidence;
        });
        // Find the verdict with highest weighted score
        let bestVerdict = 'unverified';
        let bestScore = 0;
        for (const [verdict, data] of verdictCounts) {
            const weightedScore = (data.count / validResults.length) * (data.totalConfidence / data.count);
            if (weightedScore > bestScore) {
                bestScore = weightedScore;
                bestVerdict = verdict;
            }
        }
        // Check for consensus (majority agreement)
        const majorityCount = Math.ceil(validResults.length / 2);
        const bestVerdictData = verdictCounts.get(bestVerdict);
        const hasConsensus = bestVerdictData ? bestVerdictData.count >= majorityCount : false;
        const avgConfidence = totalWeightedConfidence / validResults.length;
        return {
            overall_verdict: bestVerdict,
            confidence_score: avgConfidence,
            results,
            consensus: hasConsensus,
            summary: this.generateSummary(bestVerdict, avgConfidence, hasConsensus, validResults, originalClaim)
        };
    }
    /**
     * Generate a human-readable summary of the fact-check results
     */
    generateSummary(verdict, confidence, hasConsensus, results, claim) {
        const consensusText = hasConsensus ? 'reached consensus' : 'showed mixed results';
        const confidenceText = confidence > 0.8 ? 'high' : confidence > 0.5 ? 'moderate' : 'low';
        let summary = `🔍 **Fact-Check Results for:** "${claim}"\n\n`;
        summary += `📊 **Overall Verdict:** ${(verdict || 'unverified').toUpperCase()} (${confidenceText} confidence: ${(confidence * 100).toFixed(1)}%)\n`;
        summary += `🤝 **API Consensus:** ${consensusText}\n\n`;
        summary += `**Individual Results:**\n`;
        results.forEach((result, index) => {
            const icon = result.source === 'claimbuster' ? '🔬' :
                result.source === 'google' ? '🌐' : '❓';
            const resultVerdict = result.verdict || 'error';
            const resultSource = result.source || 'unknown';
            summary += `${icon} **${resultSource.toUpperCase()}:** ${resultVerdict.toUpperCase()} (${(result.confidence * 100).toFixed(1)}%)\n`;
            summary += `   ${result.explanation || 'No explanation available'}\n\n`;
        });
        return summary;
    }
    /**
     * Quick fact-check using only the fastest/most reliable API
     */
    async quickCheck(claim) {
        // Use Google for quick checks as primary option
        if (this.googleApiKey) {
            return await this.checkWithGoogle(claim);
        }
        // Fallback to ClaimBuster
        if (this.claimbusterApiKey) {
            return await this.checkWithClaimBuster(claim);
        }
        return {
            source: 'google',
            verdict: 'error',
            confidence: 0,
            explanation: 'No fact-checking APIs are configured',
            sources: []
        };
    }
    /**
     * Check if APIs are properly configured
     */
    getAPIStatus() {
        return {
            claimbuster: !!this.claimbusterApiKey,
            google: !!this.googleApiKey
        };
    }
}
exports.MultiAPIFactChecker = MultiAPIFactChecker;
//# sourceMappingURL=multiAPIFactChecker.js.map