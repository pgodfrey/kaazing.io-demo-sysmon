import { Component, OnInit } from '@angular/core';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  
  stocksArray:any[] = [];
  stockIndexList = {};
  stockCharts = {};

  ngOnInit() {
      var stocksArray = this.stocksArray;
      var stockIndexList = this.stockIndexList;
      var stockCharts = this.stockCharts;

      var svgChartHeight = 180;
      var svgChartWidth = 280;
      var numPricesInChart = 100;
      var numPricesInBarChart = 20;

      function getSectorPath(x, y, outerDiameter, a1, a2) {
        const degtorad = Math.PI / 180;
        const halfOuterDiameter = outerDiameter / 2;
        const cr = halfOuterDiameter - 5;
        const cx1 = (Math.cos(degtorad * a2) * cr) + x;
        const cy1 = (-Math.sin(degtorad * a2) * cr) + y;
        const cx2 = (Math.cos(degtorad * a1) * cr) + x;
        const cy2 = (-Math.sin(degtorad * a1) * cr) + y;
    
        return "M" + x + " " + y + " " + cx1 + " " + cy1 + " A" + cr + " " + cr + " 0 0 1 " + cx2 + " " + cy2 + "Z";
      }

      function getColorForGauge(value){
        var hue=((1-value)*120).toString(10);
        return ["hsl(",hue,",100%,50%)"].join("");
      }
      function addValueToLineChart(name, value, isBar) {
        var chartData = stockCharts[name];

        if (chartData === undefined) {
          chartData = {};
          chartData['rawPrices'] = [];
          chartData['min'] = value;
          chartData['max'] = value;

          stockCharts[name] = chartData;
        }

        var rawPrices = chartData['rawPrices'];
        rawPrices.push(value);
     
        if (!isBar && rawPrices.length > numPricesInChart) rawPrices.shift();
        else if (isBar && rawPrices.length > numPricesInBarChart) rawPrices.shift();

        chartData['max'] = Math.max.apply(null, rawPrices);
        chartData['min'] = Math.min.apply(null, rawPrices);

        //Run through and normalize prices to make them fit into chart height
        var min = chartData['min'];
        var max = chartData['max'];
        var diff = max-min;

        var chartPoints = "";
        if (!isBar) { //Start at bottom left
          chartPoints += "0,"+svgChartHeight+"\n";
        }
        var chartx = 0;
        for (var i=0; i<rawPrices.length; i++) {
          var normalisedPrice;
          if (diff != 0) normalisedPrice = ((rawPrices[i]-min)/diff)*svgChartHeight;
          else normalisedPrice = 0;

          if (!isBar) {
            chartPoints += ""+chartx+","+Math.floor(svgChartHeight-normalisedPrice)+"\n";
            chartx = chartx + (svgChartWidth/numPricesInChart);
          }
          else {
            chartPoints += ""+chartx+","+svgChartHeight+"\n";
            chartPoints += ""+chartx+","+Math.floor(svgChartHeight-normalisedPrice)+"\n";
            chartPoints += ""+chartx+","+svgChartHeight+"\n";
            chartx = chartx + (svgChartWidth/numPricesInBarChart);
          }
        }

        if (!isBar) { //Draw to bottom right, and then back to bottom left
          chartPoints += ""+chartx+","+svgChartHeight+"\n";
          chartPoints += "0,"+svgChartHeight+"\n";
        }

        return chartPoints;
      }
      
      let source = new EventSource('https://app.example.com/sysmon');
      source.addEventListener('message', message => {

        let dataJson = JSON.parse((message as any).data);  //Sometimes ng serve would compain that data was not an object on this type, so this casts it to "any"
        dataJson.value = parseFloat(dataJson.value).toFixed(2);

        //See if the object is already in the list
        if (stockIndexList[dataJson.name] != undefined) {
          var oldValue = stocksArray[stockIndexList[dataJson.name]].value;
          stocksArray[stockIndexList[dataJson.name]] = dataJson;

          //Add chart  
          if (dataJson.chartType == "dial") {
            if (dataJson.value > 100) dataJson.value = 100;
            dataJson.chart = getSectorPath(140, 130, 240, Math.floor(((100-dataJson.value)/100)*180), 180);
            dataJson.fill = getColorForGauge(dataJson.value/100);
            
          }
          else if (dataJson.chartType == "line") {
            dataJson.chart = addValueToLineChart(dataJson.name, dataJson.value, false); //chart;
          }
          else if (dataJson.chartType == "bar") {
            dataJson.chart = addValueToLineChart(dataJson.name, dataJson.value, true); //chart;
          }
          else if (dataJson.chartType == "pie") {
            //TODO
          }

          //See if new price is higher or lower
          if (oldValue > dataJson.value) {
            dataJson.isHigher = false;
          }
          else {
            dataJson.isHigher = true;
          }
        }
        else {
          //Add it
          stocksArray.push(dataJson);

          //Sort the array
          stocksArray.sort((a: any, b: any) => {
            if (a.name < b.name) {
              return -1;
            } else if (a.name > b.name) {
              return 1;
            } else {
              return 0;
            }
          });

          //Calculate the stockIndexList (used for updating elements)
          for (var i=0; i<stocksArray.length; i++) {
            var data = stocksArray[i];
            stockIndexList[data.name] = i;
          }
        }
      }, false);
  }
  title = 'System Monitoring Demo';
}
