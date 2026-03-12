<?php
require_once 'ApiController.php';

class DashboardController extends ApiController {
    public function getDashboardData() {
        $companyId = $_GET['company_id'] ?? null;
        
        if (!$companyId || !is_numeric($companyId)) {
            $this->sendResponse([
                "success" => false,
                "message" => "Valid company ID is required"
            ], 400);
            return;
        }

        try {
            $response = [
                'success' => true,
                'data' => [
                    'cashFlow' => $this->getCashFlowData($companyId),
                    'incomeExpense' => $this->getIncomeExpenseData($companyId),
                    'recentInvoices' => $this->getRecentInvoices($companyId),
                    'latestIncome' => $this->getLatestIncome($companyId),
                    'latestExpenses' => $this->getLatestExpenses($companyId),
                    'stats' => $this->getDashboardStats($companyId)
                ]
            ];

            $this->sendResponse($response);
            
        } catch (Exception $e) {
            error_log("Dashboard Error: " . $e->getMessage());
            $this->sendResponse([
                "success" => false,
                "message" => "Failed to fetch dashboard data",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    private function getCashFlowData($companyId) {
        try {
            $result = $this->executeProcedure('GetCashFlowData', [$companyId]);
            return $result ?: [];
        } catch (Exception $e) {
            error_log("Cash Flow Error: " . $e->getMessage());
            return [];
        }
    }

    private function getIncomeExpenseData($companyId) {
        try {
            $result = $this->executeProcedure('GetIncomeExpenseRatio', [$companyId]);
            return $result ?: [];
        } catch (Exception $e) {
            error_log("Income/Expense Error: " . $e->getMessage());
            return [];
        }
    }

    private function getRecentInvoices($companyId) {
        try {
            $result = $this->executeProcedure('GetRecentInvoices', [$companyId]);
            return $result ?: [];
        } catch (Exception $e) {
            error_log("Invoices Error: " . $e->getMessage());
            return [];
        }
    }

    private function getLatestIncome($companyId) {
        try {
            $result = $this->executeProcedure('GetLatestIncome', [$companyId]);
            return $result ?: [];
        } catch (Exception $e) {
            error_log("Income Error: " . $e->getMessage());
            return [];
        }
    }

    private function getLatestExpenses($companyId) {
        try {
            $result = $this->executeProcedure('GetLatestExpenses', [$companyId]);
            return $result ?: [];
        } catch (Exception $e) {
            error_log("Expenses Error: " . $e->getMessage());
            return [];
        }
    }

    private function getDashboardStats($companyId) {
        try {
            $result = $this->executeProcedure('GetDashboardStats', [$companyId]);
            return $result[0] ?? [
                'netWorth' => 'R 0.00',
                'incomeToday' => 'R 0.00',
                'expenseToday' => 'R 0.00',
                'incomeThisMonth' => 'R 0.00',
                'expenseThisMonth' => 'R 0.00'
            ];
        } catch (Exception $e) {
            error_log("Stats Error: " . $e->getMessage());
            return [
                'netWorth' => 'R 0.00',
                'incomeToday' => 'R 0.00',
                'expenseToday' => 'R 0.00',
                'incomeThisMonth' => 'R 0.00',
                'expenseThisMonth' => 'R 0.00'
            ];
        }
    }
}