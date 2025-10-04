import { v4 as uuid } from 'uuid';
import { executeQuery } from '../../lib/snowflake';

export async function savePortfolio(userId: string, portfolioData: {
    gpa: number;
    testScores: any;
    extracurriculars: any[];
    essays: string;
    achievements: any[];
}) {
    const portfolioId = uuid();
    
    await executeQuery(
        `INSERT INTO portfolios 
         (portfolio_id, user_id, gpa, test_scores, extracurriculars, essays, achievements) 
         VALUES (?, ?, ?, PARSE_JSON(?), PARSE_JSON(?), ?, PARSE_JSON(?))`,
        [
            portfolioId,
            userId,
            portfolioData.gpa,
            JSON.stringify(portfolioData.testScores),
            JSON.stringify(portfolioData.extracurriculars),
            portfolioData.essays,
            JSON.stringify(portfolioData.achievements)
        ]
    );
    
    return portfolioId;
}

export async function getPortfolio(userId: string) {
    const rows = await executeQuery(
        `SELECT * FROM portfolios WHERE user_id = ?`,
        [userId]
    );
    
    return rows[0] || null;
}