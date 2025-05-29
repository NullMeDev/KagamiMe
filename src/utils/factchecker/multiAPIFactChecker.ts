// Multi-API Fact Checker for KagamiMe
// Rule-based implementation with Google Fact Check and ClaimBuster APIs

import axios from 'axios';

export interface FactCheckResult {
    source: 'rules-engine' | 'claimbuster' | 'google';
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

interface RulePattern {
    pattern: RegExp;
    verdict: 'true' | 'false' | 'mixed' | 'unverified';
    confidence: number;
    explanation: string;
    sources: string[];
}

export class MultiAPIFactChecker {
    private claimbusterApiKey: string;
    private googleApiKey: string;
    private rules: RulePattern[];

    constructor() {
        this.claimbusterApiKey = process.env.CLAIMBUSTER_API_KEY || '';
        this.googleApiKey = process.env.GOOGLE_API_KEY || '';
        this.rules = this.initializeRules();
    }

    /**
     * Initialize the rule-based fact checking patterns
     */
    private initializeRules(): RulePattern[] {
        return [
            {
                pattern: /earth\s+is\s+flat/i,
                verdict: 'false',
                confidence: 0.95,
                explanation: 'The Earth is demonstrably round, as proven by multiple lines of evidence including photos from space, circumnavigation, and direct observation of the planet\'s curvature.',
                sources: [
                    'https://www.nasa.gov/topics/earth/features/20111028_earth_shape.html',
                    'https://www.nationalgeographic.org/encyclopedia/geodesy/'
                ]
            },
            {
                pattern: /vaccines?\s+cause\s+autism/i,
                verdict: 'false',
                confidence: 0.95,
                explanation: 'Extensive scientific research has found no link between vaccines and autism. Multiple large-scale studies involving millions of children have conclusively disproven this claim.',
                sources: [
                    'https://www.cdc.gov/vaccinesafety/concerns/autism.html',
                    'https://www.who.int/vaccine_safety/committee/topics/mmr/dec_2002/en/'
                ]
            },
            {
                pattern: /5g\s+(causes?|spreads?|linked\s+to)\s+(coronavirus|covid|covid-?19)/i,
                verdict: 'false',
                confidence: 0.95,
                explanation: 'There is no scientific evidence that 5G technology causes or is linked to COVID-19. Viruses cannot travel on radio waves or mobile networks.',
                sources: [
                    'https://www.who.int/emergencies/diseases/novel-coronavirus-2019/advice-for-public/myth-busters',
                    'https://fullfact.org/health/5G-not-accelerating-coronavirus/'
                ]
            },
            {
                pattern: /climate\s+change\s+is\s+(a\s+hoax|not\s+real|fake)/i,
                verdict: 'false',
                confidence: 0.95,
                explanation: 'Climate change is supported by overwhelming scientific consensus. Multiple independent lines of evidence show that the Earth is warming due to human activities.',
                sources: [
                    'https://climate.nasa.gov/scientific-consensus/',
                    'https://www.ipcc.ch/report/ar6/wg1/'
                ]
            },
            {
                pattern: /evolution\s+is\s+(just\s+a\s+theory|not\s+real|false)/i,
                verdict: 'false',
                confidence: 0.92,
                explanation: 'Evolution is supported by overwhelming scientific evidence. In science, a "theory" refers to an explanation that has been repeatedly tested and confirmed through observation and experimentation.',
                sources: [
                    'https://www.nationalacademies.org/evolution',
                    'https://www.scientificamerican.com/article/15-answers-to-creationist/'
                ]
            }
            // Add more rules for common misinformation as needed
        ];
    }

    /**
     * Check a claim using the rule-based system
     */
    async checkWithRules(claim: string): Promise<FactCheckResult> {
        try {
            // Check against our rule patterns
            for (const rule of this.rules) {
                if (rule.pattern.test(claim)) {
                    return {
                        source: 'rules-engine',
                        verdict: rule.verdict,
                        confidence: rule.confidence,
                        explanation: rule.explanation,
                        sources: rule.sources
                    };
                }
            }

            // If no rule matches, perform basic keyword analysis
            const keywordAnalysis = this.analyzeKeywords(claim);
            
            return {
                source: 'rules-engine',
                verdict: 'unverified',
                confidence: 0.3, // Low confidence for non-rule matches
                explanation: `No direct rule match found. ${keywordAnalysis}`,
                sources: []
            };

        } catch (error) {
            console.error('Rules-based fact-check error:', error);
            return {
                source: 'rules-engine',
                verdict: 'error',
                confidence: 0,
                explanation: `Rules-based check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                sources: []
            };
        }
    }

    /**
     * Perform basic keyword analysis for claims without direct rule matches
     */
    private analyzeKeywords(claim: string): string {
        const lowerClaim = claim.toLowerCase();
        const keywords = {
            questionable: ['hoax', 'conspiracy', 'they don\'t want you to know', 'secret', 'hidden truth', 'cover-up', 'deep state'],
            credible: ['research shows', 'study finds', 'evidence suggests', 'according to', 'scientists found', 'data indicates'],
            uncertain: ['may', 'might', 'could', 'possibly', 'potentially', 'suggests', 'indicates']
        };
        
        const matches = {
            questionable: keywords.questionable.filter(word => lowerClaim.includes(word)),
            credible: keywords.credible.filter(word => lowerClaim.includes(word)),
            uncertain: keywords.uncertain.filter(word => lowerClaim.includes(word))
        };
        
        if (matches.questionable.length > 0) {
            return `Contains potentially questionable language (${matches.questionable.join(', ')}). Consider checking reliable sources.`;
        } else if (matches.credible.length > 0) {
            return `Contains references to research or studies (${matches.credible.join(', ')}), but verification of specific claims is still needed.`;
        } else if (matches.uncertain.length > 0) {
            return `Contains uncertain language (${matches.uncertain.join(', ')}), suggesting the claim may not be definitive.`;
        }
        
        return 'No clear indicators of credibility or questionability found in the text.';
    }

    /**
     * Check a claim using ClaimBuster API
     */
    async checkWithClaimBuster(claim: string): Promise<FactCheckResult> {
        try {
            if (!this.claimbusterApiKey) {
                throw new Error('ClaimBuster API key not configured');
            }

            // First, get claim score
            const scoreResponse = await axios.get('https://idir.uta.edu/claimbuster/api/v2/score/text', {
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
                    const searchResponse = await axios.get('https://idir.uta.edu/claimbuster/api/v2/query/fact_matcher', {
                        params: {
                            input_claim: claim,
                            api_key: this.claimbusterApiKey
                        },
                        timeout: 10000
                    });
                    factCheckResults = searchResponse.data?.claims || [];
                } catch (searchError) {
                    console.warn('ClaimBuster search failed:', searchError);
                }
            }

            let verdict: FactCheckResult['verdict'] = 'unverified';
            let confidence = claimScore;
            let explanation = `ClaimBuster check-worthiness score: ${(claimScore * 100).toFixed(1)}%`;
            let sources: string[] = [];

            if (factCheckResults && factCheckResults.length > 0) {
                const topResult = factCheckResults[0];
                const rating = topResult.ruling?.toLowerCase() || '';
                
                if (rating.includes('true') || rating.includes('correct')) {
                    verdict = 'true';
                } else if (rating.includes('false') || rating.includes('incorrect')) {
                    verdict = 'false';
                } else if (rating.includes('mixed') || rating.includes('partly')) {
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

        } catch (error) {
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
    async checkWithGoogle(claim: string): Promise<FactCheckResult> {
        try {
            if (!this.googleApiKey) {
                throw new Error('Google Fact Check API key not configured');
            }

            const response = await axios.get('https://factchecktools.googleapis.com/v1alpha1/claims:search', {
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
            let verdict: FactCheckResult['verdict'] = 'unverified';
            let confidence = 0.7; // Default confidence for Google results

            // Map Google ratings to our verdicts
            if (rating.includes('true') || rating.includes('correct') || rating.includes('accurate')) {
                verdict = 'true';
                confidence = 0.9;
            } else if (rating.includes('false') || rating.includes('incorrect') || rating.includes('inaccurate')) {
                verdict = 'false';
                confidence = 0.9;
            } else if (rating.includes('mixed') || rating.includes('partly') || rating.includes('partially')) {
                verdict = 'mixed';
                confidence = 0.8;
            } else if (rating.includes('unverified') || rating.includes('unknown')) {
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

        } catch (error) {
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
    async checkClaim(claim: string, useAllAPIs: boolean = true): Promise<MultiAPIResult> {
        const results: FactCheckResult[] = [];
        
        // Run checks in parallel for speed
        const promises: Promise<FactCheckResult>[] = [];
        
        // Always include the rules-based checker
        promises.push(this.checkWithRules(claim));
        
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
    private calculateConsensus(results: FactCheckResult[], originalClaim: string): MultiAPIResult {
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
        const verdictCounts = new Map<string, { count: number; totalConfidence: number }>();
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
    private generateSummary(verdict: string, confidence: number, hasConsensus: boolean, results: FactCheckResult[], claim: string): string {
        const consensusText = hasConsensus ? 'reached consensus' : 'showed mixed results';
        const confidenceText = confidence > 0.8 ? 'high' : confidence > 0.5 ? 'moderate' : 'low';
        
        let summary = `🔍 **Fact-Check Results for:** "${claim}"\n\n`;
        summary += `📊 **Overall Verdict:** ${(verdict || 'unverified').toUpperCase()} (${confidenceText} confidence: ${(confidence * 100).toFixed(1)}%)\n`;
        summary += `🤝 **API Consensus:** ${consensusText}\n\n`;
        
        summary += `**Individual Results:**\n`;
        results.forEach((result, index) => {
            const icon = result.source === 'rules-engine' ? '📏' : 
                        result.source === 'claimbuster' ? '🔬' : 
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
    async quickCheck(claim: string): Promise<FactCheckResult> {
        // Use rules-based checker for quick checks
        return await this.checkWithRules(claim);
        
        // Fallback to Google if available
        if (this.googleApiKey) {
            return await this.checkWithGoogle(claim);
        }
        
        // Last resort - ClaimBuster
        if (this.claimbusterApiKey) {
            return await this.checkWithClaimBuster(claim);
        }
        
        return {
            source: 'rules-engine',
            verdict: 'error',
            confidence: 0,
            explanation: 'No fact-checking APIs are configured',
            sources: []
        };
    }

    /**
     * Check if APIs are properly configured
     */
    getAPIStatus(): { [key: string]: boolean } {
        return {
            rules: true, // Rules engine is always available
            claimbuster: !!this.claimbusterApiKey,
            google: !!this.googleApiKey
        };
    }
}

