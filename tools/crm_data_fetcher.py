from langchain_core.tools import tool

@tool
def crm_data_fetcher(company_name: str) -> str:
    """
    Fetches real-time CRM profile data, contact names, and company pain points.
    ALWAYS use this tool to gather personalized data on a prospect before writing a cold email.
    """
    # In a production environment, this would be a live API call to a CRM. 
    # For our factory test, we will mock a database response.
    mock_database = {
        "acme logistics": {
            "cfo_name": "Sarah Jenkins",
            "pain_point": "spending $50,000 a month on manual data entry",
            "recent_news": "just expanded their fleet to 500 trucks"
        },
        "globex shipping": {
            "cfo_name": "Michael Chang",
            "pain_point": "experiencing a 30% error rate in vendor billing",
            "recent_news": "recently acquired a smaller regional carrier"
        }
    }

    # Search for a match in our database
    company_key = company_name.lower()
    for key, data in mock_database.items():
        if key in company_key:
            return (
                f"CFO Name: {data['cfo_name']} | "
                f"Major Pain Point: {data['pain_point']} | "
                f"Recent News: {data['recent_news']}"
            )
    
    return "No CRM data found for this company. Proceed with generic value propositions."
