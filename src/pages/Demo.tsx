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
        // 首先尝试从localStorage获取
        const localData = localStorage.getItem(`experiment_${id}`);
        if (localData) {
          const experimentData: ExperimentData = JSON.parse(localData);
          const displayData: ExperimentDisplayData = {
            id: experimentData.experiment_id,
            title: '实验演示', // 可以从实验内容中提取标题
            htmlContent: experimentData.html_content,
            cssContent: experimentData.css_content,
            jsContent: experimentData.js_content
          };
          setExperiment(displayData);
          setLoading(false);
          return;
        }

        // 如果localStorage中没有，尝试从API获取
        const response = await apiClient.getExperiment(id);
        if (response.success && response.data) {
          const displayData: ExperimentDisplayData = {
            id: response.data.experiment_id,
            title: '实验演示',
            htmlContent: response.data.html_content,
            cssContent: response.data.css_content,
            jsContent: response.data.js_content
          };
          setExperiment(displayData);
        } else {
          throw new Error(response.error || '获取实验数据失败');
        }
      } catch (error) {
        console.error('加载实验失败:', error);
        // 不使用fallback，直接显示错误
        setExperiment(null);
      } finally {
        setLoading(false);
      }
    };

    loadExperiment();
  }, [id]);

  useEffect(() => {
    if (experiment && experiment.htmlContent) {
      // 直接使用完整的HTML内容
      const iframe = document.getElementById('experiment-iframe') as HTMLIFrameElement;
      if (iframe) {
        // 如果html_content已经是完整的HTML文档，直接使用
        if (experiment.htmlContent.includes('<!doctype html>') || experiment.htmlContent.includes('<!DOCTYPE html>')) {
          iframe.srcdoc = experiment.htmlContent;
        } else {
          // 如果不是完整文档，包装一下
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
    navigate('/');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: '#2D3748' }}>
        <div className="text-gray-600">加载实验中...</div>
      </div>
    );
  }

  if (!experiment) {
    return (
      <div className="h-screen relative" style={{ backgroundColor: '#2D3748' }}>
        {/* 返回按钮 */}
        <button
          onClick={handleGoBack}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 px-4 py-2 bg-dark-bg-secondary hover:bg-dark-bg-tertiary border border-dark-border rounded-low text-dark-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>

        {/* 错误信息 */}
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-600 text-lg mb-4">实验不存在或加载失败</div>
            <div className="text-gray-500 text-sm">请检查实验ID是否正确，或稍后重试</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen relative" style={{ backgroundColor: '#2D3748' }}>
      {/* 返回按钮 */}
      <button
        onClick={handleGoBack}
        className="absolute top-4 left-4 z-10 flex items-center gap-2 px-4 py-2 bg-dark-bg-secondary hover:bg-dark-bg-tertiary border border-dark-border rounded-low text-dark-text transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      {/* 实验展示区域 */}
      <iframe
        id="experiment-iframe"
        className="w-full h-full border-none"
        title={experiment?.title || '实验演示'}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}