import React, { useState, useCallback, useContext, useEffect } from 'react';
import { addDays, addSeconds, setHours, setMinutes, format } from 'date-fns';
import * as locales from 'date-fns/locale';

import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { ThemeContext } from '@context';
import { UITypes, DATE_FORMAT, UI, RDF } from '@constants';

import { parseInitialValue, isValidDate, getClosestLocale } from '@utils';

export const DateTimePicker = props => {
  const { id, data, updateData } = props;

  const [selectedDate, setDate] = useState(null);
  const [invalidate, setInvalid] = useState(null);

  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    setDate(parseInitialValue(data[UI.VALUE], data[RDF.TYPE]));
  }, [data[UI.VALUE]]);

  const minValue = data[UI.MINVALUE];
  const maxValue = data[UI.MAXVALUE];
  const mindateOffset = parseInt(data[UI.MIN_DATE_OFFSET], 10);
  const maxdateOffset = parseInt(data[UI.MAX_DATE_OFFSET], 10);
  const mindatetimeOffset = parseInt(data[UI.MIN_DATETIME_OFFSET], 10);
  const maxdatetimeOffset = parseInt(data[UI.MAX_DATETIME_OFFSET], 10);
  const label = data[UI.LABEL] || '';
  const type = data[RDF.TYPE];

  const onChange = date => {
    /* User wants to remove the date */
    if (!date) {
      updateData(id, '');
      setDate(null);
      return;
    }

    let value;
    /* assign the format to save based on the type */
    if (type === UITypes.TimeField) value = format(date, DATE_FORMAT.TIME);
    if (type === UITypes.DateField) value = format(date, DATE_FORMAT.DATE);
    if (type === UITypes.DateTimeField) value = date.toISOString();

    updateData(id, value);
    setDate(date);
  };

  /* set the date ranges based on the UI Element to display */
  let minDate;
  let maxDate;
  let minTime;
  let maxTime;
  let dateOptions;

  /* Transform the incoming values depending on the type of element to display */
  if (type === UITypes.TimeField) {
    /* min, max Values are times */
    let minHours;
    let minMinutes;
    let maxHours;
    let maxMinutes;

    const timeFormat = /ˆ\d{1,2}:\d{2}$/;

    /* we make the assumption that min,maxValue are in the HH:mm format */
    if (minValue && timeFormat.test(minValue)) {
      [minHours, minMinutes] = minValue.split(':');
      minTime = setHours(setMinutes(new Date(), minMinutes), minHours);
    } else {
      minTime = setHours(setMinutes(new Date(), 0), 0);
    }

    if (maxValue && timeFormat.test(maxValue)) {
      [maxHours, maxMinutes] = maxValue.split(':');
      maxTime = setHours(setMinutes(new Date(), maxMinutes), maxHours);
    } else {
      maxTime = setHours(setMinutes(new Date(), 59), 23);
    }

    dateOptions = {
      minTime,
      maxTime,
      dateFormat: 'p',
      showTimeSelect: true,
      showTimeSelectOnly: true
    };
  }

  if (type === UITypes.DateTimeField) {
    /* min, max Values are datetimes and offset is in seconds */
    if (!Number.isNaN(mindatetimeOffset)) minDate = addSeconds(new Date(), mindatetimeOffset);
    if (!Number.isNaN(maxdatetimeOffset)) maxDate = addSeconds(new Date(), maxdatetimeOffset);

    /* min,maxValue take priority over the offsets if both values are provided */
    if (minValue) minDate = new Date(minValue);
    if (maxValue) maxDate = new Date(maxValue);

    dateOptions = { minDate, maxDate, dateFormat: 'Pp', showTimeSelect: true };
  }

  if (type === UITypes.DateField) {
    /* min,maxValue are dates and offset is in days */
    if (!Number.isNaN(mindateOffset)) minDate = addDays(new Date(), mindateOffset);
    if (!Number.isNaN(maxdateOffset)) maxDate = addDays(new Date(), maxdateOffset);

    /* min,maxValue take priority over the offsets if both values are provided */
    if (minValue) minDate = new Date(minValue);
    if (maxValue) maxDate = new Date(maxValue);

    dateOptions = { minDate, maxDate, dateFormat: 'P' };
  }

  const locale = getClosestLocale();
  try {
    registerLocale(locale.code, locale);
  } catch (e) {
    registerLocale('en-US', locales.enUS);
  }

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <DatePicker
        {...{
          id,
          ...dateOptions,
          selected: isValidDate(selectedDate) ? selectedDate : null,
          onChange,
          className: theme && theme.inputText,
          locale: locale.code
        }}
      />
    </div>
  );
};
