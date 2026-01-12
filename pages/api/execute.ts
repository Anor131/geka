
import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { command } = req.body;

  if (!command) {
    return res.status(400).json({ error: 'No command provided' });
  }

  try {
    // تنفيذ الأمر مباشرة على الويندوز/الماك/لينكس
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr && !stdout) {
      return res.status(500).json({ status: 'ERROR', message: stderr });
    }

    return res.status(200).json({ 
      status: 'SUCCESS', 
      output: stdout || 'Command executed successfully with no output.' 
    });
  } catch (error: any) {
    return res.status(500).json({ 
      status: 'CRITICAL_ERROR', 
      message: error.message 
    });
  }
}
