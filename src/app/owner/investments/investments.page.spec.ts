import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InvestmentsPage } from './investments.page';

describe('InvestmentsPage', () => {
  let component: InvestmentsPage;
  let fixture: ComponentFixture<InvestmentsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(InvestmentsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
