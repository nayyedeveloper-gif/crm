package com.salecrm.crmhistory.entity;

/**
 * Type of CRM activity recorded. Used by the "Action" filter on the history list.
 */
public enum ActionType {
    PURCHASE,   // ဝယ်ယူ
    INQUIRY,    // စုံစမ်း
    FOLLOW_UP,  // ဆက်သွယ်
    COMPLAINT,  // တိုင်ကြား
    OTHER       // အခြား
}
