import React, { Component } from 'react';
import PropTypes from 'prop-types';

import './Calendar.less';

import Navigation from './Calendar/Navigation';
import CenturyView from './CenturyView';
import DecadeView from './DecadeView';
import YearView from './YearView';
import MonthView from './MonthView';

import { getBegin, getRange } from './shared/dates';
import { setLocale } from './shared/locales';
import { isCalendarType, isValue } from './shared/propTypes';
import { mergeFunctions } from './shared/utils';

const allViews = ['century', 'decade', 'year', 'month'];
const allValueTypes = [...allViews.slice(1), 'day'];

export default class Calendar extends Component {
  get drillDownAvailable() {
    const views = this.getLimitedViews();
    const { view } = this.state;

    return views.indexOf(view) < views.length - 1;
  }

  get drillUpAvailable() {
    const views = this.getLimitedViews();
    const { view } = this.state;

    return views.indexOf(view) > 0;
  }

  /**
   * Returns value type that can be returned with currently applied settings.
   */
  get valueType() {
    const { maxDetail } = this.props;
    return allValueTypes[allViews.indexOf(maxDetail)];
  }

  get valueFrom() {
    const { value } = this.props;
    return this.getValueFrom(value);
  }

  get valueTo() {
    const { value } = this.props;
    return this.getValueTo(value);
  }

  getValueArray(value) {
    if (value instanceof Array) {
      return value;
    }
    return getRange(this.valueType, value);
  }

  getValueFrom(value) {
    const rawValueFrom = value instanceof Array ? value[0] : value;
    return getRange(this.valueType, rawValueFrom)[0];
  }

  getValueTo(value) {
    const rawValueFrom = value instanceof Array ? value[1] : value;
    return getRange(this.valueType, rawValueFrom)[1];
  }

  /**
   * Returns views array with disallowed values cut off.
   */
  getLimitedViews(props = this.props) {
    const { minDetail, maxDetail } = props;

    return allViews.slice(allViews.indexOf(minDetail), allViews.indexOf(maxDetail) + 1);
  }

  /**
   * Determines whether a given view is allowed with currently applied settings.
   */
  isViewAllowed(props = this.props, view = this.state.view) {
    const views = this.getLimitedViews(props);

    return views.includes(view);
  }

  /**
   * Gets current value in a desired format.
   */
  getProcessedValue(value) {
    const { returnValue } = this.props;

    switch (returnValue) {
      case 'start':
        return this.getValueFrom(value);
      case 'end':
        return this.getValueTo(value);
      case 'range':
        return this.getValueArray(value);
      default:
        throw new Error('Invalid returnValue.');
    }
  }

  state = {
    activeStartDate: this.getActiveStartDate(),
    view: this.getView(),
  }

  componentWillMount() {
    setLocale(this.props.locale);
  }

  componentWillReceiveProps(nextProps) {
    const { props } = this;

    const allowedViewChanged = (
      nextProps.minDetail !== props.minDetail ||
      nextProps.maxDetail !== props.maxDetail
    );

    const nextValueFrom = this.getValueFrom(nextProps.value);
    const valueFrom = this.getValueFrom(props.value);
    const valueFromChanged = (
      (nextValueFrom && !valueFrom) ||
      (nextValueFrom && valueFrom && nextValueFrom.getTime() !== valueFrom.getTime())
    );

    const nextValueTo = this.getValueTo(nextProps.value);
    const valueTo = this.getValueTo(props.value);
    const valueToChanged = (
      (nextValueTo && !valueTo) ||
      (nextValueTo && valueTo && nextValueTo.getTime() !== valueTo.getTime())
    );

    const valueChanged = valueFromChanged || valueToChanged;

    const nextState = {};

    if (nextProps.locale !== props.locale) {
      setLocale(nextProps.locale);
    }

    if (allowedViewChanged) {
      if (!this.isViewAllowed(nextProps)) {
        nextState.view = this.getView(nextProps);
      }
    }

    if (allowedViewChanged || valueChanged) {
      nextState.activeStartDate = this.getActiveStartDate(nextProps);
    }

    this.setState(nextState);
  }

  getActiveStartDate(props = this.props) {
    const rangeType = this.getView(props);
    return getBegin(rangeType, this.getValueFrom(props.value));
  }

  getView(props = this.props) {
    const { view } = props;

    if (this.getLimitedViews(props).includes(view)) {
      return view;
    }

    return this.getLimitedViews(props).pop();
  }

  /**
   * Called when the user opens a new view.
   */
  setView = (view) => {
    this.setState((prevState) => {
      const activeRange = getRange(view, prevState.activeStartDate);
      const [activeStartDate] = activeRange;

      return {
        activeStartDate,
        view,
      };
    });
  }

  /**
   * Called when the user uses navigation buttons.
   */
  setActiveStartDate = activeStartDate => this.setState({ activeStartDate })

  drillDown = (activeStartDate) => {
    if (!this.drillDownAvailable) {
      return;
    }

    const views = this.getLimitedViews();

    this.setState(prevState => ({
      activeStartDate,
      view: views[views.indexOf(prevState.view) + 1],
    }));
  }

  drillUp = () => {
    if (!this.drillUpAvailable) {
      return;
    }

    const views = this.getLimitedViews();

    this.setState(prevState => ({
      view: views[views.indexOf(prevState.view) - 1],
    }));
  }

  onChange = (value) => {
    this.setState({ value });

    const { onChange } = this.props;
    const processedValue = this.getProcessedValue(value);
    if (onChange) onChange(processedValue);
  }

  renderContent() {
    const { setView, valueType } = this;
    const { calendarType, showWeekNumbers, value } = this.props;
    const { activeStartDate, view } = this.state;

    const commonProps = {
      activeStartDate,
      setView,
      value,
      valueType,
    };

    const clickAction = this.drillDownAvailable ? this.drillDown : this.onChange;

    switch (view) {
      case 'century':
        return (
          <CenturyView
            onChange={mergeFunctions(clickAction, this.props.onClickDecade)}
            {...commonProps}
          />
        );
      case 'decade':
        return (
          <DecadeView
            onChange={mergeFunctions(clickAction, this.props.onClickYear)}
            {...commonProps}
          />
        );
      case 'year':
        return (
          <YearView
            onChange={mergeFunctions(clickAction, this.props.onClickMonth)}
            {...commonProps}
          />
        );
      case 'month':
        return (
          <MonthView
            calendarType={calendarType}
            onChange={mergeFunctions(clickAction, this.props.onClickDay)}
            showWeekNumbers={showWeekNumbers}
            {...commonProps}
          />
        );
      default:
        throw new Error(`Invalid view: ${view}.`);
    }
  }

  renderNavigation() {
    return (
      <Navigation
        activeRange={this.state.activeRange}
        activeStartDate={this.state.activeStartDate}
        drillUp={this.drillUp}
        nextLabel={this.props.nextLabel}
        next2Label={this.props.next2Label}
        prevLabel={this.props.prevLabel}
        prev2Label={this.props.prev2Label}
        setActiveStartDate={this.setActiveStartDate}
        view={this.state.view}
        views={this.getLimitedViews()}
      />
    );
  }

  render() {
    return (
      <div className="react-calendar">
        {this.renderNavigation()}
        {this.renderContent()}
      </div>
    );
  }
}

Calendar.defaultProps = {
  maxDetail: 'month',
  minDetail: 'century',
  returnValue: 'start',
  view: 'month',
};

Calendar.propTypes = {
  calendarType: isCalendarType,
  locale: PropTypes.string,
  maxDetail: PropTypes.oneOf(allViews),
  minDetail: PropTypes.oneOf(allViews),
  next2Label: PropTypes.string,
  nextLabel: PropTypes.string,
  onChange: PropTypes.func,
  onClickDay: PropTypes.func,
  onClickDecade: PropTypes.func,
  onClickMonth: PropTypes.func,
  onClickYear: PropTypes.func,
  prev2Label: PropTypes.string,
  prevLabel: PropTypes.string,
  returnValue: PropTypes.oneOf(['start', 'end', 'range']).isRequired,
  showWeekNumbers: PropTypes.bool,
  value: isValue,
  view: PropTypes.oneOf(allViews), // eslint-disable-line react/no-unused-prop-types
};
