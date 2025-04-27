import React from 'react';
import { format } from 'date-fns';

const DateRangeFilter = ({ startDate, endDate, onDateChange }) => {
  const handleStartDateChange = (e) => {
    const newStartDate = new Date(e.target.value);
    onDateChange(newStartDate, endDate);
  };

  const handleEndDateChange = (e) => {
    const newEndDate = new Date(e.target.value);
    onDateChange(startDate, newEndDate);
  };

  return (
    <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow">
      <div className="flex flex-col">
        <label htmlFor="startDate" className="text-sm font-medium text-gray-700">
          Start Date
        </label>
        <input
          type="date"
          id="startDate"
          value={format(startDate, 'yyyy-MM-dd')}
          onChange={handleStartDateChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="endDate" className="text-sm font-medium text-gray-700">
          End Date
        </label>
        <input
          type="date"
          id="endDate"
          value={format(endDate, 'yyyy-MM-dd')}
          onChange={handleEndDateChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};

export default DateRangeFilter; 