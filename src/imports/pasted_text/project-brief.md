You are the autonomous coding agent for my existing project.

PROJECT:
"Loyalty & Reward-Driven E-Commerce Platform"

PROJECT LOCATION:
`/home/lydesk/Documents/Projects/loyalty-platform`

==================================================
PROJECT VISION
==============

Build a SMALL, practical Khmer/local e-commerce platform with a strong focus on:

LOYALTY POINTS + MEMBERSHIP TIERS + REWARDS + GAMIFICATION + REFERRALS

This is a university software engineering project.

Do NOT turn this into a huge enterprise e-commerce platform.

The system should be realistic for a local Cambodian/Khmer online shop while demonstrating advanced loyalty and reward concepts.

The main purpose is to demonstrate how a loyalty system can encourage customers to purchase repeatedly and increase customer retention.

==================================================
TECHNOLOGY
==========

Use:

* PHP
* Laravel
* MongoDB
* MongoDB as the ONLY application database

IMPORTANT:

DO NOT use MySQL.
DO NOT use PostgreSQL.
DO NOT create SQL migrations.
DO NOT design the system around relational SQL tables.

Use MongoDB collections and document relationships appropriate for a NoSQL application.

If the existing project already has a compatible Laravel structure, preserve it.

First inspect the existing repository and determine what is already implemented.

==================================================
IMPORTANT AGENT BEHAVIOR
========================

Work directly inside the repository.

DO NOT ask me to:

* explain the README
* paste composer.json
* paste .env
* manually provide source files
* tell you which files to edit
* explain the existing project structure

You can inspect the repository yourself.

Your workflow:

1. Inspect the existing project.
2. Determine Laravel/PHP versions.
3. Inspect existing source code.
4. Determine the current frontend architecture.
5. Determine the existing MongoDB configuration.
6. Reuse working code.
7. Implement missing functionality.
8. Run commands yourself.
9. Test the implementation.
10. Fix errors yourself.
11. Continue until the requested functionality works.

Do not stop at giving instructions.

Actually implement the system.

Never expose secrets from `.env`.

==================================================
CORE BUSINESS IDEA
==================

This is a local Cambodian online shop.

Example products:

* Khmer snacks
* Coffee
* Cambodian products
* Clothes
* Beauty products
* Accessories
* Small electronics
* Local lifestyle products

Customers can:

1. Register.
2. Browse products.
3. View product details.
4. Add products to cart.
5. Checkout.
6. Make an order.
7. Earn loyalty points.
8. Increase their loyalty tier.
9. Redeem rewards.
10. Earn badges.
11. Refer friends.
12. View their loyalty history.

The e-commerce functionality should remain simple.

The LOYALTY SYSTEM is the main feature.

==================================================
MODULE 1 — ROLE & PERMISSION MANAGEMENT
=======================================

This module is mandatory.

Implement simple role-based access control.

Roles:

1. Super Admin
2. Marketing Manager
3. Loyalty Program Manager
4. Customer

Customer membership tiers:

* Silver
* Gold
* Platinum

IMPORTANT:

Do not treat Silver/Gold/Platinum as completely separate security roles.

They are MEMBERSHIP TIERS.

The system should support tier-gated features.

Examples:

Silver:

* Basic rewards

Gold:

* Gold rewards
* Better point earning

Platinum:

* Exclusive rewards
* Highest point multiplier
* Platinum-only promotions

Admin permissions should control management functions.

==================================================
MODULE 2 — ACTIVITY LOG
=======================

This module is mandatory.

Create an audit/activity logging system.

Record important events:

* User registration
* Login
* Order creation
* Order completion
* Points earned
* Points spent
* Points manually adjusted
* Tier upgrade
* Tier downgrade
* Badge awarded
* Reward redeemed
* Referral conversion

For loyalty transactions, record:

* user ID
* event type
* points amount
* balance before
* balance after
* reason
* related order ID if applicable
* rule used
* timestamp

This is important because customers may dispute their loyalty points.

Create an admin page to:

* view logs
* filter by user
* filter by event
* filter by date

==================================================
MODULE 3 — SIMPLE PRODUCT & CATALOG
===================================

Keep the e-commerce system simple.

Implement:

* Create Product
* View Products
* Update Product
* Delete Product
* Product Details
* Product Category
* Product Price
* Product Stock
* Product Image
* Bonus Point Product

Each product should support loyalty configuration such as:

* normal points
* bonus points
* bonus multiplier

Example:

Product:

Khmer Coffee

Price:
$10

Normal earning:
10 points

Bonus campaign:
2x points

Do NOT build a complex multi-vendor marketplace.

There is only ONE shop/platform.

==================================================
MODULE 4 — SIMPLE ORDER & CHECKOUT
==================================

Implement:

* Cart
* Cart Items
* Checkout
* Order
* Order Items
* Order Status
* Order History

Order statuses:

PENDING
CONFIRMED
PROCESSING
SHIPPED
COMPLETED
CANCELLED

The loyalty engine should react to order status.

IMPORTANT:

Points should normally be awarded when the order becomes COMPLETED, not simply when the customer creates the order.

Prevent customers from receiving points from cancelled orders.

==================================================
MODULE 5 — LOYALTY POINT ENGINE
===============================

THIS IS THE MAIN FEATURE.

Implement a real loyalty point system.

Customers earn points from activities such as:

1. Completed purchase
2. Bonus-point products
3. Promotional campaigns
4. Referrals
5. Selected engagement activities

Example basic rule:

$1 spent = 1 point

Example bonus:

Weekend campaign = 2x points

Example:

Customer spends $50.

Normal:
50 points

Weekend 2x campaign:
100 points

The system must keep a POINT TRANSACTION LEDGER.

Every point change must create a transaction.

Example:

{
"user_id": "...",
"type": "EARN",
"points": 100,
"balance_before": 500,
"balance_after": 600,
"reason": "Completed order",
"order_id": "...",
"created_at": "..."
}

Support:

* Earn points
* Spend points
* Manual adjustment
* Point history
* Balance
* Expiration policy
* Bonus campaigns

Do NOT directly modify the balance without creating a transaction record.

==================================================
MODULE 6 — MEMBERSHIP TIERS
===========================

Implement:

SILVER
GOLD
PLATINUM

Use configurable thresholds.

Example initial configuration:

Silver:
0–999 qualifying points

Gold:
1,000–4,999 qualifying points

Platinum:
5,000+ qualifying points

These values should be configurable by the Loyalty Program Manager.

Each tier can have benefits.

Example:

Silver:

* 1x points
* Basic rewards

Gold:

* 1.5x points
* Gold rewards
* Special promotions

Platinum:

* 2x points
* Platinum-only rewards
* Exclusive promotions
* Priority support

The customer's tier should be automatically calculated based on the configured rules.

Also support:

* Manual tier override
* Upgrade
* Downgrade
* Tier history
* Reason for manual override

==================================================
MODULE 7 — REWARDS
==================

THIS IS THE SECOND MAIN FEATURE.

Create a reward catalog.

Example rewards:

* $2 Discount Voucher
* $5 Discount Voucher
* Free Coffee
* Free Shipping
* Khmer Snack Box
* Exclusive Product
* Platinum Exclusive Reward

Each reward should contain:

* name
* description
* points required
* stock/quantity
* active status
* minimum tier
* expiration date if needed

Example:

Reward:
$5 Discount Voucher

Cost:
500 points

Minimum tier:
Gold

Therefore:

Silver cannot redeem it.

Gold can redeem it.

Platinum can redeem it.

Implement:

* View rewards
* Create reward
* Update reward
* Delete reward
* Redeem reward
* Redemption history
* Redemption limits
* Insufficient point validation
* Tier eligibility validation

When a customer redeems a reward:

1. Verify customer has enough points.
2. Verify customer tier.
3. Verify reward is active.
4. Verify reward has remaining stock.
5. Deduct points.
6. Create loyalty transaction.
7. Create redemption record.
8. Create activity log.

These operations should be performed safely so points cannot be deducted twice.

==================================================
MODULE 8 — GAMIFICATION & BADGES
================================

Implement a simple badge system.

Example badges:

FIRST_PURCHASE
LOYAL_CUSTOMER
BIG_SPENDER
FIVE_ORDERS
TEN_ORDERS
REFERRAL_CHAMPION
POINT_COLLECTOR

Badge conditions should be configurable.

Examples:

First Purchase:
Customer completes first order.

5 Orders:
Customer completes 5 orders.

Referral Champion:
Customer successfully refers 5 customers.

Point Collector:
Customer earns 1,000 points.

When the condition is satisfied:

* automatically award badge
* record badge award
* create activity log

Display badges on customer profile.

==================================================
MODULE 9 — REFERRAL PROGRAM
===========================

Keep referral functionality simple.

Every customer gets a unique referral code.

Example:

KHMER-MENGLY-8F2A

Customer can share:

Referral link/code.

When a new customer:

1. Registers using the referral code.
2. Completes their first order.

The system records a successful referral.

Example:

Referrer receives:
100 points

New customer receives:
50 points

Prevent:

* self-referral
* duplicate referral rewards
* multiple rewards for the same first purchase

Record referral events in the activity log.

==================================================
MODULE 10 — CUSTOMER RETENTION ANALYTICS
========================================

Keep analytics realistic and understandable.

Implement an admin dashboard showing:

* Total Customers
* Active Customers
* Total Orders
* Completed Orders
* Total Loyalty Points Issued
* Total Loyalty Points Redeemed
* Silver Customers
* Gold Customers
* Platinum Customers
* Total Rewards Redeemed
* Referral Conversions
* Top Customers
* Most Redeemed Rewards

Also provide simple retention indicators:

* repeat customers
* one-time customers
* customers inactive for 30 days
* customers inactive for 60 days
* customers inactive for 90 days

IMPORTANT:

Do NOT claim that the system has advanced AI churn prediction unless a real model is implemented.

For this student project, a transparent rule-based "customer engagement/churn risk indicator" is acceptable.

Example:

LOW RISK:
Recent purchase + frequent activity

MEDIUM RISK:
No purchase for 30–60 days

HIGH RISK:
No purchase for 60+ days

Clearly label this as a rule-based indicator, not real AI prediction.

==================================================
KHMER / CAMBODIAN LOCALIZATION
==============================

The platform should feel appropriate for Cambodia.

Support:

* Khmer language labels where appropriate
* USD
* KHR
* Cambodian phone number format
* Cambodian addresses/provinces
* Local products
* Khmer customer names
* Cambodian-style customer data

Example provinces:

Phnom Penh
Siem Reap
Battambang
Kampong Cham
Kampot
Sihanoukville
Kandal
Takeo

Use realistic Cambodian sample data.

Do not use only Western demo data.

==================================================
NO-SQL DATA MODEL
=================

Use MongoDB collections.

Possible collections:

users
roles
permissions
products
categories
orders
carts
loyalty_accounts
loyalty_transactions
loyalty_tiers
rewards
reward_redemptions
badges
user_badges
referrals
campaigns
activity_logs

Adapt the structure to MongoDB rather than trying to imitate SQL tables unnecessarily.

Use embedded documents where appropriate.

Use references where documents can grow too large or require independent querying.

==================================================
SECURITY
========

Protect:

* Admin routes
* Loyalty management
* Point adjustment
* Reward management
* Tier management
* Product management
* Activity logs

Customers must never be able to:

* change their own points
* change their tier
* redeem without enough points
* access another customer's orders
* access another customer's loyalty history
* grant themselves rewards

Never trust loyalty values sent by the frontend.

Calculate important values on the server.

==================================================
UI REQUIREMENTS
===============

Create a clean, modern but simple e-commerce UI.

Customer navigation should include:

Home
Products
Cart
Orders
Rewards
My Points
My Tier
Badges
Referrals
Profile

Customer dashboard should prominently show:

Current Tier
Current Points
Progress to Next Tier
Available Rewards
Recent Point Transactions
Badges
Referral Code

Admin dashboard should show:

Customers
Products
Orders
Points
Tiers
Rewards
Badges
Referrals
Activity Logs
Analytics

Do not make the UI unnecessarily complicated.

==================================================
SAMPLE DATA
===========

Create seed/sample data suitable for a Cambodian local shop.

Include:

* 20+ customers
* Silver/Gold/Platinum distribution
* 15+ products
* 5+ categories
* 8+ rewards
* 6+ badges
* sample orders
* sample loyalty transactions
* sample referrals
* activity logs

Use realistic Khmer/Cambodian names and products.

==================================================
USER PERSONAS
=============

The system should support three main personas:

1. CUSTOMER

Example:
Cambodian online shopper who purchases local products and wants to collect points and redeem useful rewards.

Main concerns:

* earning points
* understanding tier progress
* finding rewards
* redeeming points
* receiving benefits

2. LOYALTY PROGRAM MANAGER

Responsible for:

* earning rules
* loyalty tiers
* rewards
* campaigns
* badges
* points adjustments
* loyalty analytics

3. SUPER ADMIN

Responsible for:

* users
* roles
* permissions
* products
* orders
* loyalty configuration
* system activity logs
* platform analytics

==================================================
OUT OF SCOPE
============

Do NOT implement unnecessary enterprise features such as:

* multi-vendor marketplace
* warehouse management system
* complex shipping logistics
* cryptocurrency
* microservices
* complicated accounting
* advanced ERP
* real-time AI recommendation engine
* complicated payment gateway integrations
* complicated affiliate networks
* unnecessary third-party integrations

The project is a SMALL LOCAL E-COMMERCE PLATFORM with a DEEP LOYALTY SYSTEM.

==================================================
QUALITY REQUIREMENTS
====================

The final project should demonstrate:

* CRUD
* Role-based permissions
* Activity logging
* NoSQL data modeling
* State transitions
* Loyalty point ledger
* Tier progression
* Reward redemption
* Gamification
* Referral tracking
* Customer retention analytics
* Server-side validation
* Security
* Testing

The loyalty engine must be the strongest and most carefully implemented part of the system.

==================================================
IMPLEMENTATION PROCESS
======================

START NOW.

First inspect the existing repository.

Do not ask me to read the README.

Do not ask me to paste files.

Determine what already exists.

Then implement the system incrementally.

After each major module:

1. Run tests.
2. Run the application.
3. Fix errors.
4. Continue.

Use the existing project structure whenever practical.

Do not unnecessarily rewrite working code.

When you finish, provide a concise summary of:

* what was implemented
* files/modules changed
* MongoDB collections created/used
* commands used to run the project
* tests performed
* any remaining genuine blockers

Do the implementation yourself rather than only explaining how I could implement it.
