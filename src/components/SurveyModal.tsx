import React, { useState } from 'react';
import { X } from 'lucide-react';
import { apiClient } from '../lib/api';

interface SurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  experimentId: string;
}

export interface SurveyData {
  experiment_id: string;
  reflects_real_world: boolean;
  visualization_rating: number;
  concept_understanding: number;
  suggestions: string;
}

export default function SurveyModal({ isOpen, onClose, onSubmit, experimentId }: SurveyModalProps) {
  const [reflectsRealWorld, setReflectsRealWorld] = useState<boolean | null>(null);
  const [visualizationRating, setVisualizationRating] = useState<number>(5);
  const [conceptUnderstanding, setConceptUnderstanding] = useState<number>(5);
  const [suggestions, setSuggestions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (reflectsRealWorld === null) {
      alert('Please answer whether the experiment reflects real-world principles.');
      return;
    }

    setIsSubmitting(true);
    
    const surveyData: SurveyData = {
      experiment_id: experimentId,
      reflects_real_world: reflectsRealWorld,
      visualization_rating: visualizationRating,
      concept_understanding: conceptUnderstanding,
      suggestions: suggestions.trim()
    };

    try {
      const response = await apiClient.submitSurvey(surveyData);
      
      if (response.success) {
        console.log('Survey submitted successfully:', response.data);
        onSubmit();
        onClose();
      } else {
        console.error('Failed to submit survey:', response.error);
        alert('Failed to submit survey. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting survey:', error);
      alert('An error occurred while submitting the survey.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Experiment Feedback</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Question 1: Real-world principles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Does this experiment reflect real-world principles?
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="reflects_real_world"
                  value="true"
                  checked={reflectsRealWorld === true}
                  onChange={() => setReflectsRealWorld(true)}
                  className="mr-2 text-blue-600"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-700">Yes</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="reflects_real_world"
                  value="false"
                  checked={reflectsRealWorld === false}
                  onChange={() => setReflectsRealWorld(false)}
                  className="mr-2 text-blue-600"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-700">No</span>
              </label>
            </div>
          </div>

          {/* Question 2: Visualization rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Rate the visualization effect (1-10)
            </label>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">1</span>
              <input
                type="range"
                min="1"
                max="10"
                value={visualizationRating}
                onChange={(e) => setVisualizationRating(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-500">10</span>
              <span className="text-sm font-medium text-gray-700 min-w-[2rem] text-center">
                {visualizationRating}
              </span>
            </div>
          </div>

          {/* Question 3: Concept understanding */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How well do you understand the concept through this experiment? (1-10)
            </label>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">1</span>
              <input
                type="range"
                min="1"
                max="10"
                value={conceptUnderstanding}
                onChange={(e) => setConceptUnderstanding(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                disabled={isSubmitting}
              />
              <span className="text-sm text-gray-500">10</span>
              <span className="text-sm font-medium text-gray-700 min-w-[2rem] text-center">
                {conceptUnderstanding}
              </span>
            </div>
          </div>

          {/* Question 4: Suggestions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Do you have any suggestions?
            </label>
            <textarea
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              placeholder="Please share your thoughts and suggestions..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}