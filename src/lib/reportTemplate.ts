export const reportTemplate = `
<!DOCTYPE html>
<html>
<head>
<style>
body {
    font-family: Arial, sans-serif;
    width: 600px;
    margin: auto;
}

.header {
    text-align: center;
    font-weight: bold;
    font-size: 18px;
}

.right {
    text-align: right;
    font-size: 12px;
}

.row {
    display: flex;
    justify-content: space-between;
    margin-top: 5px;
}
.row-gold{
	display: flex;
    justify-content: space-between;
    margin-top: 5px;
    font-size: 20px;
    font-weight: bold;
}

.line {
	border: dashed 1px black;
    margin: 10px 0;
}

.table, th ,td {
    border-collapse: collapse;
    border: 1px solid grey;
}
td:nth-child(1),
td:nth-child(3),
td:nth-child(5) {
    width: 22%;
}

td:nth-child(2),
td:nth-child(4),
td:nth-child(6) {
    width: 20%;
    text-align:right;
}
</style>
</head>

<body>

<div class="right">{{DATE}} &nbsp; {{TIME}}</div>

<div class="row">
    <div>Customer Name : {{CUSTOMER_NAME}}</div>
</div>

<div class="row">
    <div>Weight : {{WEIGHT}}</div>
    <div>Sample Type : {{SAMPLE_TYPE}}</div>
</div>

<div class="line"></div>

<div class="row-gold">
    <div>Gold Purity : {{GOLD_PURITY}}</div>
    <div>Karat : {{KARAT}}</div>
</div>

<div class="line"></div>

<table style="width: 100%;">
  <tr>
    <td>SILVER</td><td>{{SILVER}}</td>
    <td>COPPER</td><td>{{COPPER}}</td>
    <td>ZINC</td><td>{{ZINC}}</td>
  </tr>

  <tr>
    <td>CADMIUM</td><td>{{CADMIUM}}</td>
    <td>NICKEL</td><td>{{NICKEL}}</td>
    <td>PALLADIUM</td><td>{{PALLADIUM}}</td>
  </tr>

  <tr>
    <td>INDIUM</td><td>{{INDIUM}}</td>
    <td>TIN</td><td>{{TIN}}</td>
    <td>IREDIUM</td><td>{{IREDIUM}}</td>
  </tr>

  <tr>
    <td>RUTHENIUM</td><td>{{RUTHENIUM}}</td>
    <td>TUNGESTAN</td><td>{{TUNGESTAN}}</td>
    <td>PLATINUM</td><td>{{PLATINUM}}</td>
  </tr>

  <tr>
    <td>LEAD</td><td>{{LEAD}}</td>
    <td>CROMIUM</td><td>{{CROMIUM}}</td>
    <td>MANGANESE</td><td>{{MANGANESE}}</td>
  </tr>

  <tr>
    <td>RHODIUM</td><td>{{RHODIUM}}</td>
    <td>IRON</td><td>{{IRON}}</td>
    <td>COBALT</td><td>{{COBALT}}</td>
  </tr>

  <tr>
    <td>GALLIUM</td><td>{{GALLIUM}}</td>
    <td>VANADIUM</td><td>{{VANADIUM}}</td>
    <td>OSMIUM</td><td>{{OSMIUM}}</td>
  </tr>
</table>

</body>
</html>
`;
