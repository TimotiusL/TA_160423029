import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinancialAnalysisPage } from './financial-analysis.page';

describe('FinancialAnalysisPage', () => {
  let component: FinancialAnalysisPage;
  let fixture: ComponentFixture<FinancialAnalysisPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FinancialAnalysisPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
