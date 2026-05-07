"use client"

import React from "react"
import { AlertTriangle, RefreshCw, Home, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import Link from "next/link"

// Main Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorFallbackProps {
  error?: Error
  resetError?: () => void
  className?: string
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo)
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    
    this.setState({
      error,
      errorInfo,
    })
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent 
          error={this.state.error} 
          resetError={this.resetError}
        />
      )
    }

    return this.props.children
  }
}

// Default Error Fallback
export function DefaultErrorFallback({ error, resetError, className }: ErrorFallbackProps) {
  return (
    <div className={cn("min-h-screen bg-gray-50 flex items-center justify-center p-4", className)}>
      <Card className="max-w-md w-full p-6 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 text-sm">
            We're sorry, but something unexpected happened. Please try again or contact support if the problem persists.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
            <p className="text-xs font-mono text-red-800 break-all">
              {error.message || 'Unknown error'}
            </p>
            {error.stack && (
              <details className="mt-2">
                <summary className="text-xs text-red-600 cursor-pointer">Show details</summary>
                <pre className="text-xs text-red-700 mt-1 overflow-auto max-h-32">
                  {error.stack.split('\n').slice(0, 5).join('\n')}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="space-y-3">
          <Button 
            onClick={resetError} 
            className="w-full bg-gray-900 hover:bg-gray-800 text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          
          <Button asChild variant="outline" className="w-full">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Link>
          </Button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Need help?{" "}
            <a 
              href="mailto:support@basehealth.com" 
              className="text-blue-600 hover:text-blue-800"
            >
              Contact Support
            </a>
          </p>
        </div>
      </Card>
    </div>
  )
}

// Page-level Error Component
interface PageErrorProps {
  title?: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  showHomeButton?: boolean
  className?: string
}

export function PageError({ 
  title = "Page Not Found", 
  message = "The page you're looking for doesn't exist or has been moved.",
  action,
  showHomeButton = true,
  className 
}: PageErrorProps) {
  return (
    <div className={cn("min-h-screen bg-gray-50 flex items-center justify-center p-4", className)}>
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-gray-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            {title}
          </h1>
          <p className="text-gray-600">
            {message}
          </p>
        </div>

        <div className="space-y-3">
          {action && (
            <Button onClick={action.onClick} className="bg-gray-900 hover:bg-gray-800 text-white">
              {action.label}
            </Button>
          )}
          
          {showHomeButton && (
            <Button asChild variant="outline">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Form Error Component
interface FormErrorProps {
  /** Alias for `message`. Backward compatible with older callers. */
  error?: string
  /** Alias for `onRetry`. Backward compatible with older callers. */
  onDismiss?: () => void
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function FormError({ 
  title = "Error", 
  message, 
  error,
  onRetry,
  onDismiss,
  className 
}: FormErrorProps) {
  const finalMessage = message ?? error ?? ""
  const finalOnRetry = onRetry ?? onDismiss
  return (
    <Alert className={cn("border-red-200 bg-red-50", className)}>
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">{title}</p>
            <p className="mt-1">{finalMessage}</p>
          </div>
          {finalOnRetry && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={finalOnRetry}
              className="text-red-600 hover:text-red-800 hover:bg-red-100"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Network Error Component
interface NetworkErrorProps {
  onRetry?: () => void
  className?: string
}

export function NetworkError({ onRetry, className }: NetworkErrorProps) {
  return (
    <FormError
      title="Connection Error"
      message="Unable to connect to our servers. Please check your internet connection and try again."
      onRetry={onRetry}
      className={className}
    />
  )
}

// API Error Component
interface ApiErrorProps {
  status?: number
  message?: string
  onRetry?: () => void
  className?: string
}

export function ApiError({ 
  status, 
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  className 
}: ApiErrorProps) {
  const getTitle = (status?: number) => {
    switch (status) {
      case 400: return "Bad Request"
      case 401: return "Unauthorized"
      case 403: return "Forbidden"
      case 404: return "Not Found"
      case 500: return "Server Error"
      default: return "Error"
    }
  }

  return (
    <FormError
      title={getTitle(status)}
      message={message}
      onRetry={onRetry}
      className={className}
    />
  )
}

// Validation Error Component
interface ValidationErrorProps {
  errors: string[]
  className?: string
}

export function ValidationError({ errors, className }: ValidationErrorProps) {
  return (
    <Alert className={cn("border-amber-200 bg-amber-50", className)}>
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        <p className="font-medium mb-2">Please fix the following errors:</p>
        <ul className="list-disc list-inside space-y-1">
          {errors.map((error, index) => (
            <li key={index} className="text-sm">{error}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}

// Success Message Component
interface SuccessMessageProps {
  title?: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function SuccessMessage({ 
  title = "Success", 
  message, 
  action,
  className 
}: SuccessMessageProps) {
  return (
    <Alert className={cn("border-green-200 bg-green-50", className)}>
      <AlertTriangle className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium">{title}</p>
            <p className="mt-1">{message}</p>
          </div>
          {action && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={action.onClick}
              className="text-green-600 hover:text-green-800 hover:bg-green-100"
            >
              {action.label}
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

// Healthcare-specific error components
export function HealthcareError({ 
  message = "We're experiencing technical difficulties with our healthcare services. Please try again or contact support.",
  onRetry,
  className 
}: { message?: string; onRetry?: () => void; className?: string }) {
  return (
    <Card className={cn("p-6 border-red-200", className)}>
      <div className="text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Healthcare Service Error
        </h3>
        <p className="text-gray-600 mb-4">{message}</p>
        
        <div className="flex gap-3 justify-center">
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          <Button asChild>
            <a href="tel:+1-800-HEALTH" className="flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              Contact Support
            </a>
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-4">
          For medical emergencies, call 911 immediately
        </p>
      </div>
    </Card>
  )
}

// Hook for error handling
export function useErrorHandler() {
  const [error, setError] = React.useState<string | null>(null)
  
  const handleError = React.useCallback((error: Error | string) => {
    const message = typeof error === 'string' ? error : error.message
    setError(message)
    console.error('Error handled:', error)
  }, [])
  
  const clearError = React.useCallback(() => {
    setError(null)
  }, [])
  
  return { error, handleError, clearError }
}
