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
        // 使用默认的单摆实验作为fallback
        const fallbackExperiment: ExperimentDisplayData = {
          id: id,
          title: '单摆运动实验',
          htmlContent: `
            <div style="display: flex; flex-direction: column; align-items: center; padding: 20px; background: #0f0f0f; color: white; min-height: 100vh;">
              <h2 style="margin-bottom: 30px; color: #ffffff;">单摆运动演示</h2>
              <div style="position: relative; width: 400px; height: 400px; border: 1px solid #2a2a2a; background: #1a1a1a; border-radius: 8px;">
                <svg width="400" height="400" style="position: absolute; top: 0; left: 0;">
                  <circle cx="200" cy="50" r="5" fill="#4a5568" />
                  <line id="pendulum-line" x1="200" y1="50" x2="200" y2="250" stroke="#718096" stroke-width="2" />
                  <circle id="pendulum-ball" cx="200" cy="250" r="15" fill="#4a5568" />
                </svg>
              </div>
              <div style="margin-top: 20px; display: flex; gap: 10px; align-items: center;">
                <button id="start-btn" style="padding: 8px 16px; background: #4a5568; color: white; border: none; border-radius: 4px; cursor: pointer;">开始</button>
                <button id="stop-btn" style="padding: 8px 16px; background: #2d3748; color: white; border: none; border-radius: 4px; cursor: pointer;">停止</button>
                <label style="margin-left: 20px; color: #e5e5e5;">摆长: <input id="length-slider" type="range" min="100" max="300" value="200" style="margin-left: 8px;" /></label>
              </div>
            </div>
          `,
          cssContent: `
            body { margin: 0; padding: 0; background: #0f0f0f; }
            button:hover { opacity: 0.8; }
            input[type="range"] { accent-color: #4a5568; }
          `,
          jsContent: `
            let isRunning = false;
            let angle = Math.PI / 4;
            let angularVelocity = 0;
            let length = 200;
            const gravity = 0.5;
            const damping = 0.995;
            
            function updatePendulum() {
              if (!isRunning) return;
              
              const angularAcceleration = -(gravity / length) * Math.sin(angle);
              angularVelocity += angularAcceleration;
              angularVelocity *= damping;
              angle += angularVelocity;
              
              const x = 200 + length * Math.sin(angle);
              const y = 50 + length * Math.cos(angle);
              
              document.getElementById('pendulum-line').setAttribute('x2', x);
              document.getElementById('pendulum-line').setAttribute('y2', y);
              document.getElementById('pendulum-ball').setAttribute('cx', x);
              document.getElementById('pendulum-ball').setAttribute('cy', y);
              
              requestAnimationFrame(updatePendulum);
            }
            
            document.getElementById('start-btn').addEventListener('click', () => {
              isRunning = true;
              updatePendulum();
            });
            
            document.getElementById('stop-btn').addEventListener('click', () => {
              isRunning = false;
            });
            
            document.getElementById('length-slider').addEventListener('input', (e) => {
              length = parseInt(e.target.value);
              if (!isRunning) {
                const x = 200 + length * Math.sin(angle);
                const y = 50 + length * Math.cos(angle);
                document.getElementById('pendulum-line').setAttribute('x2', x);
                document.getElementById('pendulum-line').setAttribute('y2', y);
                document.getElementById('pendulum-ball').setAttribute('cx', x);
                document.getElementById('pendulum-ball').setAttribute('cy', y);
              }
            });
          `
        };
        setExperiment(fallbackExperiment);
      } finally {
        setLoading(false);
      }
    };

    loadExperiment();
  }, [id]);

  useEffect(() => {
    if (experiment) {
      // 验证和清理JavaScript代码
      const cleanJsContent = experiment.jsContent
        .replace(/<[^>]*>/g, '') // 移除HTML标签
        .replace(/```javascript\s*/g, '').replace(/```js\s*/g, '').replace(/```\s*/g, '') // 移除代码块标记
        .trim();

      // 创建完整的HTML文档
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${experiment.title}</title>
          <style>${experiment.cssContent}</style>
        </head>
        <body>
          ${experiment.htmlContent}
          <script>
            // 错误处理
            window.addEventListener('error', function(e) {
              console.error('实验脚本错误:', e.error);
              console.error('错误位置:', e.filename, '行', e.lineno);
            });
            
            // 实验代码
            try {
              ${cleanJsContent}
            } catch (error) {
              console.error('实验代码执行错误:', error);
              document.body.innerHTML = '<div style="color: red; padding: 20px; text-align: center;">实验代码执行出错，请检查控制台</div>';
            }
          </script>
        </body>
        </html>
      `;

      // 更新iframe内容
      const iframe = document.getElementById('experiment-iframe') as HTMLIFrameElement;
      if (iframe) {
        iframe.srcdoc = fullHtml;
      }
    }
  }, [experiment]);

  const handleGoBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-dark-text-secondary">加载实验中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-dark-bg relative">
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