import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateReportAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';

export function ReportCard() {
  const [report, setReport] = useState<{ report: string; actionableInsight: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    setLoading(true);
    setReport(null);
    try {
      const result = await generateReportAction();
      setReport(result);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error Generating Report',
        description: 'Could not generate the financial report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Financial Report</CardTitle>
        <CardDescription>
          Use AI to get insights into your spending habits for the current month.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleGenerateReport} disabled={loading} className="w-full">
          <Wand2 className="mr-2 h-4 w-4" />
          {loading ? 'Generating...' : 'Generate with AI'}
        </Button>

        {loading && (
          <div className="space-y-4 pt-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {report && (
          <div className="space-y-4 pt-4 text-sm">
            <div>
              <h4 className="font-semibold mb-1">AI-Powered Report</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{report.report}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Actionable Insight</h4>
              <p className="text-muted-foreground p-3 bg-primary/5 border border-primary/20 rounded-md">{report.actionableInsight}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
