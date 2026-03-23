import express, { Request, Response, Router } from 'express';
import { PublicLeadService } from '../service/public-lead-service';
import { Logger } from '../utils/logger';

const router: Router = express.Router();
router.post('/generate-leads', async (req: Request, res: Response) => {
  console.log('🔥 /api/generate-leads called', req.body);

  try {
    const { industry, limit } = req.body as { industry?: string; limit?: number };

    if (!industry || !industry.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu industry',
      });
    }

    Logger.info(`📥 Generate leads cho ngành: ${industry}`);

    const service = new PublicLeadService();
    const result = await service.generate(industry, limit);

    return res.status(200).json({
      success: true,
      industry,
      totalCompanies: result.companies.length,
      totalEmployees: result.employees.length,
      companies: result.companies,
      employees: result.employees,
    });
  } catch (error) {
    Logger.error('❌ Lỗi generate leads:', error);

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal Server Error',
    });
  }
});

export default router;


