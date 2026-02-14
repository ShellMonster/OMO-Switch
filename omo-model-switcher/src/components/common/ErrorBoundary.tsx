import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 错误边界组件
 * 
 * 功能：
 * - 捕获子组件树中的 JavaScript 错误
 * - 显示友好的错误界面
 * - 提供重试功能
 * - 记录错误信息用于调试
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误信息到控制台
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">
                  应用程序遇到错误
                </h1>
                <p className="text-slate-600">
                  很抱歉，应用程序遇到了一个意外错误。您可以尝试刷新页面或联系技术支持。
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
                <h2 className="text-sm font-semibold text-slate-700 mb-2">错误详情：</h2>
                <p className="text-sm text-red-600 font-mono break-all">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-3">
                    <summary className="text-sm text-slate-600 cursor-pointer hover:text-slate-800">
                      查看堆栈跟踪
                    </summary>
                    <pre className="mt-2 text-xs text-slate-600 overflow-auto max-h-64 bg-white p-3 rounded border border-slate-200">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={this.handleReset}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重新加载
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                刷新页面
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                如果问题持续存在，请尝试清除浏览器缓存或联系技术支持
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
