import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { format, formatDistanceStrict, add } from 'date-fns';
import { sample } from 'lodash';

export interface ApiStocksResponse {
  symbol: string;
  name: string;
  price: number;
}

export interface Timeline {
  [key: string]: StockObject[];
}

export interface StockObject {
  name: string;
  initial: string;
  current: string;
  change: ChangeTuple;
}

export type ChangeTuple = [ boolean, string, string ];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public title = 'Stock Simulator';
  public isLoading = false;
  public displayedColumns = ['name', 'initial', 'current', 'change'];
  public startDate: Date;
  public currentDate: Date;
  public days: Timeline = {}

  public constructor(private http: HttpClient) {
    this.startDate = new Date();
    this.currentDate = this.startDate;
  }

  public ngOnInit() {
    this.isLoading = true;
    this.http
      .get<ApiStocksResponse[]>('https://staging-api.brainbase.com/stocks.php')
      .subscribe((data) => {
        this.setDay(
          this.getTimestampFromDate(this.startDate),
          data.map((stock) => this.buildStockObject(`${stock.name} (${stock.symbol})`, stock.price.toFixed(2), stock.price.toFixed(2)))
        );
        this.isLoading = false;
      })
  }

  private setDay(timestamp: string, stocks: StockObject[]): void {
    if (this.days.hasOwnProperty(timestamp)) return;
    this.days[timestamp] = stocks;
  }

  private getTimestampFromDate(date: Date): string {
    return format(date, 'T');
  }

  private calculateFluctuation(value: number): number {
    const rise = sample([true, false]);
    // const amount = sample([...Array(11).keys()]); // include no fluctuation
    const amount = sample(Array.from(Array(10), (_, i) => i + 1)); // do not include null fluctuation
    const percentage = (amount / 100) * value
    return (rise) ? percentage : percentage * (-1);
  }

  private calculateChange(initial: number, current: number): ChangeTuple {
    return [
      current > initial,
      (current - initial).toFixed(2),
      Math.floor(((current - initial) / initial) * 100).toString()
    ];
  }

  private buildStockObject(name: string, initial: string, current: string): StockObject {
    const parsedInitial = parseFloat(initial);
    const parsedCurrent = parseFloat(current);
    const newCurrent = parsedCurrent + this.calculateFluctuation(parsedCurrent);
    const change = this.calculateChange(parsedInitial, newCurrent);
    return { name, initial, current: newCurrent.toFixed(2), change }
  }

  public goToNextDay(): void {
    const currentDayStocks = this.getCurrentDayStocks();
    const nextDay = add(this.currentDate, { days: 1 });
    this.setDay(
      this.getTimestampFromDate(nextDay),
      currentDayStocks.map((stock) => this.buildStockObject(stock.name, stock.initial, stock.current))
    )
    this.currentDate = nextDay;
  }

  public getCurrentDayStocks(): StockObject[] {
    return this.days[this.getTimestampFromDate(this.currentDate)];
  }

  public getFormattedCurrentDate(): string {
    return format(this.currentDate, 'EEEE, MMMM d, yyyy');
  }

  public getDayDistance(): string {
    const distance = parseInt(formatDistanceStrict(this.startDate, this.currentDate, { unit: 'day' }).split(' ')[0]);
    return (distance + 1).toString();
  }
}
