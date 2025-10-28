import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient, type ExperimentData } from '@/lib/api';

interface ExperimentDisplayData {
  id: string;
  title: string;
  htmlContent: string;
  cssContent: string;
  jsContent: string;
}

export default function Demo() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [experiment, setExperiment] = useState<ExperimentDisplayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadExperiment = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        // First try to get from localStorage
        const localData = localStorage.getItem(`experiment_${id}`);
        if (localData) {
          const experimentData: ExperimentData = JSON.parse(localData);
          const displayData: ExperimentDisplayData = {
            id: experimentData.experiment_id,
            title: 'Experiment Demo', // Can extract title from experiment content
            htmlContent: experimentData.html_content,
            cssContent: experimentData.css_content,
            jsContent: experimentData.js_content
          };
          setExperiment(displayData);
          setLoading(false);
          return;
        }

        // If not in localStorage, try to get from API
        const response = await apiClient.getExperiment(id);
        if (response.success && response.data) {
          const displayData: ExperimentDisplayData = {
            id: response.data.experiment_id,
            title: 'Experiment Demo',
            htmlContent: response.data.html_content,
            cssContent: response.data.css_content,
            jsContent: response.data.js_content
          };
          setExperiment(displayData);
        } else {
          throw new Error(response.error || 'Failed to fetch experiment data');
        }
      } catch (error) {
        console.error('Failed to load experiment:', error);
        // Don't use fallback, show error directly
        setExperiment(null);
      } finally {
        setLoading(false);
      }
    };

    loadExperiment();
  }, [id]);

  useEffect(() => {
    if (experiment && experiment.htmlContent) {
      // Use complete HTML content directly
      const iframe = document.getElementById('experiment-iframe') as HTMLIFrameElement;
      if (iframe) {
        // If html_content is already a complete HTML document, use it directly
        if (experiment.htmlContent.includes('<!doctype html>') || experiment.htmlContent.includes('<!DOCTYPE html>')) {
          iframe.srcdoc = experiment.htmlContent;
        } else {
          // If not a complete document, wrap it
          const fullHtml = `
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${experiment.title}</title>
            </head>
            <body>
              ${experiment.htmlContent}
            </body>
            </html>
          `;
          iframe.srcdoc = fullHtml;
        }
      }
    }
  }, [experiment]);

  const handleGoBack = () => {
    navigate('/app', { state: { showSurvey: true, experimentId: id } });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: '#2D3748' }}>
        <div className="text-gray-600">Loading experiment...</div>
      </div>
    );
  }

  if (!experiment) {
    return (
      <div className="h-screen flex flex-col" style={{ backgroundColor: '#2D3748' }}>
        {/* Back button header */}
        <div className="flex-shrink-0 p-4" style={{ backgroundColor: '#f7fafc' }}>
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 px-4 py-2 bg-dark-bg-secondary hover:bg-dark-bg-tertiary border border-dark-border rounded-low text-dark-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Error message */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-600 text-lg mb-4">Experiment not found or failed to load</div>
            <div className="text-gray-500 text-sm">Please check if the experiment ID is correct, or try again later</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#2D3748' }}>
      {/* Back button header */}
      <div className="flex-shrink-0 p-4" style={{ backgroundColor: '#f7fafc' }}>
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 px-4 py-2 bg-dark-bg-secondary hover:bg-dark-bg-tertiary border border-dark-border rounded-low text-dark-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Experiment display area */}
      <div className="flex-1 min-h-0">
        <iframe
          id="experiment-iframe"
          className="w-full h-full border-none"
          title={experiment?.title || 'Experiment Demo'}
          // Only allow scripts; keeping allow-same-origin would let the experiment access the host context.
          sandbox="allow-scripts"
        />
      </div>
    </div>
  );
}
