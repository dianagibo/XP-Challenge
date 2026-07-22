const weeklyReportService = require('./weekly-report.service');

async function show(request, response, next) {
  try {
    const report = await weeklyReportService.getWeeklyReport(request.session.user, request.query.week);
    return response.render('pages/weekly-family-report', {
      pageTitle: 'Reporte semanal familiar', activePage: 'report', report
    });
  } catch (error) { return next(error); }
}

module.exports = { show };
